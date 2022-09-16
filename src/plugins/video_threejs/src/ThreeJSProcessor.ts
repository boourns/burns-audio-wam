import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

const getThreeJSProcessor = (moduleId: string) => {
	
	const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
	const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

	const WamProcessor = ModuleScope.WamProcessor

	const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor

	class ThreeJSExampleProcessor extends DynamicParameterProcessor {

		/**
         * Implement custom DSP here.
         * @param {number} startSample beginning of processing slice
         * @param {number} endSample end of processing slice
         * @param {Float32Array[][]} inputs
         * @param {Float32Array[][]} outputs
         */
		_process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
			if (inputs.length != outputs.length) {
				return
			}

			for (let i = 0; i < inputs.length; i++) {
				for (let j = 0; j < inputs[i].length; j++) {
					for (let k = 0; k < inputs[i][j].length; k++) {
						outputs[i][j][k] = inputs[i][j][k]
					}
				}
			}
			return;
		}
	}

	try {
		audioWorkletGlobalScope.registerProcessor(moduleId, ThreeJSExampleProcessor as typeof WamProcessor);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn(error);
	}

	return ThreeJSExampleProcessor

}

export default getThreeJSProcessor