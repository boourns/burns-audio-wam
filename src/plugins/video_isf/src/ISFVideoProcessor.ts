import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

const moduleId = 'com.sequencerParty.isfVideo'

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor
const WamProcessor = ModuleScope.WamProcessor

class ISFVideoProcessor extends DynamicParameterProcessor {
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, ISFVideoProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
