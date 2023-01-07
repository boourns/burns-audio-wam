import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";
import { Clip } from "./Clip";
import { StepModulatorKernel } from "./StepModulatorKernel";

const moduleId = 'com.sequencerParty.stepmod'
const PPQN = 24

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor

let quantizeValues = [
    1,
    3,
    6,
    12,
    24,
    96
]

class StepModulatorProcessor extends WamProcessor {

    // @ts-ignore
    _generateWamParameterInfo() {
		return this.sequencer.wamParameters()
	}

    sequencer: StepModulatorKernel

    lastTime: number
    lastBPM: number
    secondsPerTick: number
    transportData?: WamTransportData
    count = 0

    pendingClipChange?: {id: string, timestamp: number} 
    currentClipId: string

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

        /* @ts-ignore */
        this.sequencer = new StepModulatorKernel(this)

        this.currentClipId = ""
        this.lastValue = 0
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

            this.sequencer.process(this.currentClipId, tickPosition, this._parameterState)
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
        } else if (message.data && message.data.action == "target") {
            this.targetParam = message.data.param
        } else {
            // @ts-ignore
            super._onMessage(message)
        }
     }

    _onTransport(transportData: WamTransportData) {
        this.transportData = transportData
    }
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, StepModulatorProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
