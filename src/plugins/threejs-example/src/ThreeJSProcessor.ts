import { AudioWorkletGlobalScope } from "@webaudiomodules/api";


const getThreeJSProcessor = (moduleId: string) => {
	
	const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
	const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

	const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor
	const WamProcessor = ModuleScope.WamProcessor

	class ThreeJSExampleProcessor extends DynamicParameterProcessor {
	}

	try {
		audioWorkletGlobalScope.registerProcessor(moduleId, ThreeJSExampleProcessor as typeof WamProcessor);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn(error);
	}

}

export default getThreeJSProcessor