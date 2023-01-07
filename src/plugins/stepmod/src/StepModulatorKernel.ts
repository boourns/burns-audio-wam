import { AudioWorkletGlobalScope, WamParameterDataMap, WamParameterInfo, WamProcessor } from "@webaudiomodules/api";
import { Clip } from "./Clip";

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

export class StepModulatorKernel {
    lastValue: number
    targetParam?: WamParameterInfo
    clips: Map<string, Clip>
    processor: WamProcessor

    ticks: number
    
    constructor() {
        this.clips = new Map()
    }

    wamParameters() {
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

    process(currentClipId: string, tickPosition: number, params: WamParameterDataMap) {
        let clip = this.clips.get(currentClipId)
        if (!clip) return

        if (!this.targetParam) return

        let clipPosition = tickPosition % (clip.state.length * clip.state.speed);

        if (this.ticks != clipPosition) {
            this.ticks = clipPosition;
        }

        let step = Math.floor(this.ticks/clip.state.speed)

        var result = 0
        var i = 0
        switch(step) {
            default:
                result = 0;
                break
            case 0:
                result = params.step1.value
                break
            case 1:
                result = params.step2.value
                break
            case 2:
                result = params.step3.value
                break
            case 3:
                result = params.step4.value
                break
            case 4:
                result = params.step5.value
                break
            case 5:
                result = params.step6.value
                break
            case 6:
                result = params.step7.value
                break
            case 7:
                result = params.step8.value
                break
        }

        let target = (step < clip.state.steps.length) ? clip.state.steps[step] + result : result
        let slew = params.slew.value
        let gain = params.gain.value

        let value = this.lastValue + ((target - this.lastValue) * (slew) * slew * slew)

        if (value != this.lastValue) {
            const { currentTime } = audioWorkletGlobalScope;

            var output = this.targetParam.minValue + (value * (this.targetParam.maxValue - this.targetParam.minValue) * gain)
            if (this.targetParam.type == 'int' || this.targetParam.type == 'choice' || this.targetParam.type == 'boolean') {
                output = Math.round(output)
            }

            this.processor.emitEvents(
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

    }
}