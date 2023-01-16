import { AudioWorkletGlobalScope, WamTransportData, WamMidiData, WamParameterConfiguration, WamParameterInfoMap, WamParameterData } from "@webaudiomodules/api";
import { StepModulatorKernel } from "./StepModulatorKernel";

const moduleId = 'com.sequencerParty.stepmod'
const PPQN = 24

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const {
    WamProcessor
 } = ModuleScope

let quantizeValues = [
    1,
    3,
    6,
    12,
    24,
    96
]

class StepModulatorProcessor extends WamProcessor {
    _generateWamParameterInfo() {
        let allParams = {}
        const seqs = this.allSequencers()
        for (let seq of seqs) {
            allParams = {
                ...allParams,
                ...seq.wamParameters()
            }
        }

        return allParams
	}

    sequencers: Record<string, StepModulatorKernel>
    sequencerOrder: string[]

    lastTime: number
    lastBPM: number
    secondsPerTick: number
    transportData?: WamTransportData
    count = 0

    pendingClipChange?: {id: string, timestamp: number} 
    currentClipId: string
    activeSteps?: Float32Array

	constructor(options: any) {
        super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

		this.lastTime = null;
		
        super.port.start();

		this.lastTime = null;
		this.ticks = 0;

        this.sequencers = {}
        this.sequencerOrder = []

        this.currentClipId = ""
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
        const { currentTime } = audioWorkletGlobalScope;

        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id
            this.pendingClipChange = undefined
        }

        if (!this.transportData) {
            return
        }
        
		if (this.transportData!.playing && currentTime > this.transportData.currentBarStarted) {
			var timeElapsed = currentTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
            var tickPosition = Math.floor(beatPosition * PPQN)

            const sequencers = this.allSequencers()

            sequencers.forEach((sequencer, index) => {
                sequencer.process(this.currentClipId, tickPosition, this._parameterState)

                if (this.activeSteps) {
                    this.activeSteps[index] = sequencer.activeStep
                }
            })
		}
        
		return
	}

    /**
	 * Messages from main thread appear here.
	 * @param {MessageEvent} message
	 */
     async _onMessage(message: any): Promise<void> {
        if (message.data?.source == "stepBuffer") {
            const sharedBuffer = message.data.buffer;
            this.activeSteps = new Float32Array(sharedBuffer);

        } else if (message.data?.source == "add") {
            const seq = new StepModulatorKernel(message.data.id, this.sequencerOrder.length, this)
            seq.setRow(this.sequencerOrder.length)

            this.sequencers[message.data.id] = seq
            
            this.sequencerOrder.push(message.data.id)

            this.updateParameters()

        } else if (message.data?.source == "delete") {
            if (this.sequencers[message.data.id]) {
                delete this.sequencers[message.data.id]
            }
            this.sequencerOrder = this.sequencerOrder.filter(id => id != message.data.id)
            this.sequencerOrder.forEach((id, index) => this.sequencers[id].setRow(index))
            this.updateParameters()

        } else if (message.data?.source == "order") {
            this.sequencerOrder = message.data.sequencerOrder
            this.sequencerOrder.forEach((id, index) => this.sequencers[id].setRow(index))
            this.updateParameters()

        } else if (message.data?.source == "sequencer") {
            await this.sequencers[message.data.sequencerId].onMessage(message)
        } else if (message.data && message.data.action == "play") {
            this.pendingClipChange = {
                id: message.data.id,
                timestamp: 0,
            }
        } else {
            await super._onMessage(message)
        }
    }

    _onTransport(transportData: WamTransportData) {
        this.transportData = transportData
    }

    _onMidi(midiData: WamMidiData) {
        const {currentTime} = audioWorkletGlobalScope

        if ((midiData.bytes[0] & 0xf0) == 0x90) {
            // midi note on
            const seqs = this.allSequencers()
            for (let s of seqs) {
                const clip = s.clips.get(this.currentClipId)
                if (clip && clip.state.speed == 0) {
                    s.activeStep = (s.activeStep + 1) % clip.length()
                    s.update(clip, this._parameterState)
                }
            }
        }

        this.emitEvents({
            type:"wam-midi",
            data: midiData,
            time: currentTime
        })
    }

    allSequencers(): StepModulatorKernel[] {
        return this.sequencerOrder.map(id => this.sequencers[id])
    }

    updateParameters() {
        const parameters = this._generateWamParameterInfo()
        let oldState = this._parameterState

        this._initialize()

        for (let paramID of Object.keys(oldState)) {
            if (!!this._parameterState[paramID]) {
                let update: WamParameterData = {
                    id: oldState[paramID].id,
                    value: oldState[paramID].value,
                    normalized: false,
                }
                this._setParameterValue(update, false)

                // this is a hack and should be unnecessary.
                this._parameterState[paramID].value = oldState[paramID].value
            }
        }
    }
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, StepModulatorProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
