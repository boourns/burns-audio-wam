import { MIDI } from "../../shared/midi";
import { AudioParamDescriptor, WamTransportData } from "sdk/src/api/types";
import WamParameterInterpolator from "sdk/src/WamParameterInterpolator"
import WamProcessor from "sdk/src/WamProcessor";

const PPQN = 24

// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import { Clip } from "./Clip";

interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
    name: string,
    processorCtor: (new (
        options?: AudioWorkletNodeOptions
    ) => AudioWorkletProcessor) & {
        parameterDescriptors?: AudioParamDescriptor[];
    }
): undefined;

const audioWorkletGlobalScope = globalThis;

// other variables that could be included:
// - renderAhead: number - how far into the future should plugins render?

export type FunctionSequencer = {
    onTick?(ticks: number): {note: number, velocity: number, duration: number}[]
}

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

        // @ts-ignore
        const { webAudioModules } = audioWorkletGlobalScope;

        // @ts-ignore
        if (globalThis.WamProcessors) globalThis.WamProcessors[instanceId] = this;
        // @ts-ignore
		else globalThis.WamProcessors = { [instanceId]: this };

        // not sure about this line
		this.proxyId = options.processorOptions.proxyId;

		this.lastTime = null;
		this.ticks = -1;
        this.clips = new Map()
        this.currentClipId = ""
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
        // @ts-ignore
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;
        
        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id
            this.pendingClipChange = undefined
        }

        let clip = this.clips.get(this.currentClipId)
        if (!clip) return

        if (!this.transportData) {
            return
        }

		if (this.transportData!.playing) {
			var timeElapsed = currentTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
            var tickPosition = Math.floor(beatPosition * PPQN)

            let clipPosition = tickPosition % clip.state.length;

            if (this.ticks != clipPosition) {
                let secondsPerTick = 1.0 / ((this.transportData!.tempo / 60.0) * PPQN);

                this.ticks = clipPosition;
                clip.notesForTick(clipPosition).forEach(note => {
                    this.emitEvents(
                        { type: 'wam-midi', time: currentTime, data: { bytes: [MIDI.NOTE_ON, note.number, note.velocity] } },
                        { type: 'wam-midi', time: currentTime+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF, note.number, note.velocity] } }
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
            // @ts-ignore
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
	registerProcessor('Tom BurnsPiano Roll', PianoRollProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
