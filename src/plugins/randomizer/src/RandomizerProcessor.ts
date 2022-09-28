import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";

const loadRandomizerProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
    
    const WamProcessor = ModuleScope.WamProcessor
    const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor
    
    class RandomizerProcessor extends DynamicParameterProcessor {
    }
    
    try {
        audioWorkletGlobalScope.registerProcessor(moduleId, RandomizerProcessor as typeof WamProcessor);
    } catch (error) {	
    }
}

export default loadRandomizerProcessor

