import { WamParameterInfo, WamTransportData, WamTransportEvent, WamTransportEvent2 } from "sdk/src/api/types";
import { Clip, PPQN } from "./Clip";
import { StepModulatorView } from "./StepModulatorView";

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

let quantizeValues = [
    1,
    3,
    6,
    12,
    24,
    96
]

class StepModulatorProcessor extends AudioWorkletProcessor {
	// @ts-ignore
	static get parameterDescriptors() {
		return [
            {
                name: 'destroyed',
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            },
            {
                name: "slew",
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1.0,
                automationRate: 'k-rate'
            },
            {
                name: "gain",
                type: "float",
                defaultValue: 1.0,
                minValue: 0,
                maxValue: 1.0,
                automationRate: 'a-rate'
            },
            {
                name: "step1",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step2",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step3",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step4",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step5",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step6",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step7",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            },            
            {
                name: "step8",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'a-rate'
            }
        ];
	}

    lastTime: number
    ticks: number
    proxyId: string
    lastBPM: number
    secondsPerTick: number
    lastValue: number
    targetParam?: WamParameterInfo
    transportData?: WamTransportData

    clips: Map<string, Clip>
    pendingClipChange?: {id: string, timestamp: number} 
    currentClipId: string

	constructor(options: any) {
		super(options);
		this.proxyId = options.processorOptions.proxyId;
		this.lastTime = null;
		this.ticks = 0;
        this.clips = new Map()
        this.currentClipId = ""
        this.lastValue = 0

        this.port.onmessage = (ev) => {
            if (ev.data.action == "clip") {
                let clip = new Clip(ev.data.id, ev.data.state)
                this.clips.set(ev.data.id, clip)
            } else if (ev.data.action == "play") {
                this.pendingClipChange = {
                    id: ev.data.id,
                    timestamp: 0,
                }
            } else if (ev.data.action == "target") {
                this.targetParam = ev.data.param
            }
        }
	}

	get proxy() {
        // @ts-ignore
		const { webAudioModules } = audioWorkletGlobalScope;
		return webAudioModules?.processors[this.proxyId];
	}

	/**
	 * Main process
	 *
	 * @param {Float32Array[][]} inputs
	 * @param {Float32Array[][]} outputs
	 * @param {Record<P, Float32Array>} parameters
	 */
     process (inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
		const destroyed = parameters.destroyed[0];
		if (destroyed) return false;
		if (!this.proxy) return true;

        // @ts-ignore
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;

        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id
            this.pendingClipChange = undefined
        }

        let clip = this.clips.get(this.currentClipId)
        if (!clip) return true;

        if (!this.targetParam) return true

        if (!this.transportData) {
            return true
        }
        
		if (this.transportData!.runFlags) {
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
                result = parameters.step1[0]
                break
            case 1:
                result = parameters.step2[0]
                break
            case 2:
                result = parameters.step3[0]
                break
            case 3:
                result = parameters.step4[0]
                break
            case 4:
                result = parameters.step5[0]
                break
            case 5:
                result = parameters.step6[0]
                break
            case 6:
                result = parameters.step7[0]
                break
            case 7:
                result = parameters.step8[0]
                break
        }
        let target = (step < clip.state.steps.length) ? clip.state.steps[step] + result : result
        // this value is inverted by the params mgr
        let slew = parameters.slew[0]

        let value = this.lastValue + ((target - this.lastValue) * (slew) * slew * slew)

        if (value != this.lastValue) {
            var output = this.targetParam.minValue + (value * (this.targetParam.maxValue - this.targetParam.minValue) * parameters.gain[0])
            if (this.targetParam.type == 'int' || this.targetParam.type == 'choice' || this.targetParam.type == 'boolean') {
                output = Math.round(output)
            }
            this.proxy.emitEvents(
                {
                    type: "automation",
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

		return true;
	}

    _onTransport(transportData: WamTransportData) {
        this.transportData = transportData
    }
}

try {
	registerProcessor('step-modulator-processor', StepModulatorProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
