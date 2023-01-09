import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

const moduleId = 'com.sequencerParty.crtVideo'

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor
const WamProcessor = ModuleScope.WamProcessor

class CRTVideoProcessor extends DynamicParameterProcessor {
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, CRTVideoProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
