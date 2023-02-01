import { AudioWorkletGlobalScope } from "@webaudiomodules/api";
import { OB6Kernel } from "./OB6Kernel";

const moduleId = "com.sequencerParty.ob6"
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

const scope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const MIDIControllerProcessor = scope.MIDIControllerProcessor

class OB6Processor extends MIDIControllerProcessor {
    loadKernel() {
        this.kernel = new OB6Kernel()
    }
}

try {
    // @ts-ignore
    audioWorkletGlobalScope.registerProcessor(moduleId, OB6Processor);
} catch (error) {  
}