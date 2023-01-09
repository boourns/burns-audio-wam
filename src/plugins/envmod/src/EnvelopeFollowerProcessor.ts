import { WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

const getEnvelopeFollowerProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
 	const {
 		WamProcessor,
 		WamParameterInfo,
 	} = ModuleScope;

    class EnvelopeFollowerProcessor extends WamProcessor {
        count = 0

        targetParam: typeof WamParameterInfo
        lastValue: number

        _generateWamParameterInfo() {
            return {
                base: new WamParameterInfo('base', {
                    type: 'float',
                    label: 'Base',
                    defaultValue: 0,
                    minValue: 0.0,
                    maxValue: 1.0,
                }),
                range: new WamParameterInfo('range', {
                    type: 'float',
                    label: 'Range',
                    defaultValue: 1.0,
                    minValue: -1.0,
                    maxValue: 1.0,
                }),
                slew: new WamParameterInfo('slew', {
                    type: 'float',
                    label: 'Slew',
                    defaultValue: 1.0,
                    minValue: 0.0,
                    maxValue: 1.0,
                }),
            }
        }

        constructor(options: any) {
            super(options)

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
            if (inputs.length == 0) {
                return
            }

            if (!this.targetParam) {
                return
            }

            const input = inputs[0]

            let min = 1
            let max = -1

            for (let i = startSample; i < endSample; i++) {
                for (let c = 0; c < input.length; c++) {
                    min = Math.min(input[c][i], min)
                    max = Math.max(input[c][i], max)
                }
            }

            const amp = max >= min ? max - min : 0

            let db = 20 * (Math.log(amp) / Math.log(10))

            if (db < -60) {
                db = -60
            }
            if (db > 0) {
                db = 0
            }

            const target = (60 + db) / 60
            let currentValue
            if (target > this.lastValue) {
                currentValue = target
            } else {
                const slew = this._parameterInterpolators.slew.values[startSample]

                currentValue = this.lastValue + ((target - this.lastValue) * (slew) * slew * slew)
            }

            if (currentValue != this.lastValue) {
                this.lastValue = currentValue

                const range = this._parameterInterpolators.range.values[startSample]
                const base = this._parameterInterpolators.base.values[startSample]

                const parameterRange = this.targetParam.maxValue - this.targetParam.minValue
                const startPosition = this.targetParam.minValue + (parameterRange * base)

                let paramValue = startPosition + (currentValue * range * parameterRange)
                if (paramValue < this.targetParam.minValue) {
                    paramValue = this.targetParam.minValue
                }
                if (paramValue > this.targetParam.maxValue) {
                    paramValue = this.targetParam.maxValue
                }
                
                if (this.targetParam.type == 'int' || this.targetParam.type == 'choice' || this.targetParam.type == 'boolean') {
                    paramValue = Math.round(paramValue)
                }

                const {currentTime} = audioWorkletGlobalScope

                this.emitEvents(
                    {
                        type: "wam-automation",
                        data: {
                            id: this.targetParam.id,
                            normalized: false,
                            value: paramValue
                        },
                        time: currentTime
                    }
                )
            }

            return;
        }

        /**
         * Messages from main thread appear here.
         * @param {MessageEvent} message
         */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.action == "target") {
                this.targetParam = message.data.param
            } else {
                // @ts-ignore
                super._onMessage(message)
            }
        }

        _onTransport(transportData: WamTransportData) {
        }
    }

    try {
        registerProcessor('com.sequencerParty.envmod', EnvelopeFollowerProcessor as typeof WamProcessor);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
    }
}

export default getEnvelopeFollowerProcessor
