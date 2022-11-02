import { MIDI } from "../../shared/midi";
import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";
import { Clip } from "./Clip";

const moduleId = 'Tom BurnsPiano Roll'
const PPQN = 24

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor

class PianoRollProcessor extends WamProcessor {
    _generateWamParameterInfo() {
        return {
        }
    }

    lastTime: number
    ticks: number
    proxyId: string
    lastBPM: number
    secondsPerTick: number
    transportData?: WamTransportData
    count: number

    clips: Map<string, Clip>
    
    pendingClipChange?: {id: string, timestamp: number} 
    currentClipId: string

    futureEvents: any[]

	constructor(options: any) {
		super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

		this.lastTime = null;
		this.ticks = -1;
        this.clips = new Map()
        this.currentClipId = "default"
        this.count = 0

        super.port.start();
	}

	/**
	 * Implement custom DSP here.
	 * @param {number} startSample beginning of processing slice
	 * @param {number} endSample end of processing slice
	 * @param {Float32Array[][]} inputs
	 * @param {Float32Array[][]} outputs
	 */
     _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
        const { currentTime } = audioWorkletGlobalScope;
        
        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id
            this.pendingClipChange = undefined
        }

        let clip = this.clips.get(this.currentClipId)
        if (!clip) {
            return
        }
        if (!this.transportData) {
            return
        }

        // lookahead
        var schedulerTime = currentTime + 0.05

		if (this.transportData!.playing && this.transportData!.currentBarStarted <= schedulerTime) {
			var timeElapsed = schedulerTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
            var tickPosition = Math.floor(beatPosition * PPQN)

            let clipPosition = tickPosition % clip.state.length;


            if (this.ticks != clipPosition) {
                let secondsPerTick = 1.0 / ((this.transportData!.tempo / 60.0) * PPQN);

                this.ticks = clipPosition;
                clip.notesForTick(clipPosition).forEach(note => {
                    this.emitEvents(
                        { type: 'wam-midi', time: schedulerTime, data: { bytes: [MIDI.NOTE_ON, note.number, note.velocity] } },
                        { type: 'wam-midi', time: schedulerTime+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF, note.number, note.velocity] } }
                    )
                })
            }
		}

		return
	}

	/**
	 * Messages from main thread appear here.
	 * @param {MessageEvent} message
	 */
     async _onMessage(message: any): Promise<void> {
        if (message.data && message.data.action == "clip") {
            let clip = new Clip(message.data.id, message.data.state)
            this.clips.set(message.data.id, clip)
        } else if (message.data && message.data.action == "play") {
            this.pendingClipChange = {
                id: message.data.id,
                timestamp: 0,
            }
        } else {
            super._onMessage(message)
        }
     }

    _onTransport(transportData: WamTransportData) {
        this.transportData = transportData

        super.port.postMessage({
            event:"transport",
            transport: transportData
        })
    }
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, PianoRollProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
