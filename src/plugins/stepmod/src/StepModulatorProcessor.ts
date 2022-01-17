import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";
import { Clip } from "./Clip";

const moduleId = 'Tom BurnsStep Sequencing Modulator'
const PPQN = 24

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor
const WamParameterInfo = ModuleScope.WamParameterInfo

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
		return {
            slew: new WamParameterInfo('slew', {
                type: "float",
                defaultValue: 1.0,
                minValue: 0,
                maxValue: 1.0,
            }),
            gain: new WamParameterInfo('gain', {
                type: "float",
                defaultValue: 1.0,
                minValue: 0,
                maxValue: 1.0,
            }),
            step1: new WamParameterInfo('step1', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step2: new WamParameterInfo('step2', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step3: new WamParameterInfo('step3', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step4: new WamParameterInfo('step4', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step5: new WamParameterInfo('step5', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step6: new WamParameterInfo('step6', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step7: new WamParameterInfo('step7', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
            step8: new WamParameterInfo('step8', {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }),
        }
	}

    lastTime: number
    ticks: number
    lastBPM: number
    secondsPerTick: number
    lastValue: number
    targetParam?: typeof WamParameterInfo
    transportData?: WamTransportData

    count = 0

    clips: Map<string, Clip>
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
        this.clips = new Map()
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

        let clip = this.clips.get(this.currentClipId)
        if (!clip) return

        if (!this.targetParam) return

        if (!this.transportData) {
            return
        }
        
		if (this.transportData!.playing) {
			var timeElapsed = currentTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
            var tickPosition = Math.floor(beatPosition * PPQN)

            let clipPosition = tickPosition % (clip.state.length * clip.state.speed);

            if (this.ticks != clipPosition) {
                this.ticks = clipPosition;
            }
		}

        let step = Math.floor(this.ticks/clip.state.speed)

        var result = 0
        var i = 0
        switch(step) {
            default:
                result = 0;
                break
            case 0:
                result = this._parameterInterpolators.step1.values[startSample]
                break
            case 1:
                result = this._parameterInterpolators.step2.values[startSample]
                break
            case 2:
                result = this._parameterInterpolators.step3.values[startSample]
                break
            case 3:
                result = this._parameterInterpolators.step4.values[startSample]
                break
            case 4:
                result = this._parameterInterpolators.step5.values[startSample]
                break
            case 5:
                result = this._parameterInterpolators.step6.values[startSample]
                break
            case 6:
                result = this._parameterInterpolators.step7.values[startSample]
                break
            case 7:
                result = this._parameterInterpolators.step8.values[startSample]
                break
        }
        let target = (step < clip.state.steps.length) ? clip.state.steps[step] + result : result
        let slew = this._parameterInterpolators.slew.values[startSample]
        let gain = this._parameterInterpolators.gain.values[startSample]

        let value = this.lastValue + ((target - this.lastValue) * (slew) * slew * slew)

        if (value != this.lastValue) {
            var output = this.targetParam.minValue + (value * (this.targetParam.maxValue - this.targetParam.minValue) * gain)
            if (this.targetParam.type == 'int' || this.targetParam.type == 'choice' || this.targetParam.type == 'boolean') {
                output = Math.round(output)
            }
            this.emitEvents(
                {
                    type: "wam-automation",
                    data: {
                        id: this.targetParam.id,
                        normalized: false,
                        value: output
                    },
                    time: currentTime
                }
            )
        }

        this.lastValue = value

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
