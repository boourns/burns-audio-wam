import { AudioWorkletGlobalScope, WamParameterConfiguration, WamParameterInfo, WamParameterInfoMap } from "@webaudiomodules/api";

const loadDynamicParameterProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
	const {
		WamProcessor,
		WamParameterInfo,
	} = ModuleScope;

    class DynamicParameterProcessor extends WamProcessor {
        parameters: WamParameterInfoMap

        _generateWamParameterInfo(): WamParameterInfoMap {
            return this.parameters;
        }

        constructor(options: any) {
            super(options);
            console.log("HERE 6")

            this.parameters = {}

            const {
                moduleId,
                instanceId,
            } = options.processorOptions;

            super.port.start();
        }

        count = 0;

        /**
         * Implement custom DSP here.
         * @param {number} startSample beginning of processing slice
         * @param {number} endSample end of processing slice
         * @param {Float32Array[][]} inputs
         * @param {Float32Array[][]} outputs
         */
        _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
            // TODO: detect transport changes and send message

            return;
        }

        _onMidi(midiData: any) {
        }

        /**
         * Messages from main thread appear here.
        //  * @param {MessageEvent} message
        //  */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.source == "dpp") {
                if (message.data.parameters) {
                    console.log("TOM got new parameters")

                    let input = message.data.parameters as Record<string, WamParameterConfiguration>
                    let output: WamParameterInfoMap = {}
                    
                    for (let key of Object.keys(input)) {
                        output[key] = new WamParameterInfo(key, input[key])
                    }
                    this.parameters = output
                    
                    console.log("parameters now ", this.parameters)

                }
            } else {
                // @ts-ignore
                super._onMessage(message)
            }
        }
    }

    ModuleScope.DynamicParameterProcessor = DynamicParameterProcessor

    return DynamicParameterProcessor
}

export default loadDynamicParameterProcessor