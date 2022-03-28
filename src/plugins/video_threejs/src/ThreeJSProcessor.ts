import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

const getThreeJSProcessor = (moduleId: string) => {
	
	const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
	const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

	const WamProcessor = ModuleScope.WamProcessor

	const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor

	class ThreeJSExampleProcessor extends DynamicParameterProcessor {

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