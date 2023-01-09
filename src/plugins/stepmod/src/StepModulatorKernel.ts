import { AudioWorkletGlobalScope, WamParameterDataMap } from "@webaudiomodules/api";
import { Clip } from "./Clip";

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

const moduleId = 'com.sequencerParty.stepmod'

const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor
const WamParameterInfo = ModuleScope.WamParameterInfo

export class StepModulatorKernel {
    lastValue: number

    targetParam?: typeof WamParameterInfo

    processor: typeof WamProcessor
    clips: Map<string, Clip>
    port: MessagePort
    paramIds: Record<string, string>
    ticks: number
    
    constructor(processor: typeof WamProcessor) {
        this.processor = processor

        this.clips = new Map()
        this.lastValue = 0
    }

    wamParameters(row: number) {
        const prefix = `row${row+1}-`

        // dynamically assign parameter names based on sequencer row
        let parameters: Record<string, string> = {}

        this.paramIds["slew"] = `${prefix}slew`
        this.paramIds["gain"] = `${prefix}gain`

        parameters[this.paramIds["slew"]] = new WamParameterInfo(this.paramIds["slew"], {
            type: "float",
            defaultValue: 1.0,
            minValue: 0,
            maxValue: 1.0,
        })

        parameters[this.paramIds["gain"]] = new WamParameterInfo(this.paramIds["gain"], {
            type: "float",
            defaultValue: 1.0,
            minValue: 0,
            maxValue: 1.0,
        })

        for (let i = 1; i < 9; i++) {
            const rowedId = `${prefix}step${i}`

            this.paramIds[`step${i}`] = rowedId

            parameters[rowedId] = new WamParameterInfo(rowedId, {
                type: "float",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            })
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
                result = params[this.paramIds["step1"]].value
                break
            case 1:
                result = params[this.paramIds["step2"]].value
                break
            case 2:
                result = params[this.paramIds["step3"]].value
                break
            case 3:
                result = params[this.paramIds["step4"]].value
                break
            case 4:
                result = params[this.paramIds["step5"]].value
                break
            case 5:
                result = params[this.paramIds["step6"]].value
                break
            case 6:
                result = params[this.paramIds["step7"]].value
                break
            case 7:
                result = params[this.paramIds["step8"]].value
                break
        }

        let target = (step < clip.state.steps.length) ? clip.state.steps[step] + result : result
        let slew = params[this.paramIds["slew"]].value
        let gain = params[this.paramIds["gain"]].value

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

    async onMessage(message: any): Promise<void> {
        if (message.data && message.data.action == "clip") {
            let clip = new Clip(message.data.id, message.data.state)
            this.clips.set(message.data.id, clip)
        } else if (message.data && message.data.action == "target") {
            this.targetParam = message.data.param
        }
    }
}