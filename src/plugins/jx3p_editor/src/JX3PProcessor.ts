import { AudioWorkletGlobalScope } from "@webaudiomodules/api";
import { JX3PKernel } from "./JX3PKernel";

const moduleId = "com.sequencerParty.jx3p"
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

const scope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const MIDIControllerProcessor = scope.MIDIControllerProcessor

class MicrokorgProcessor extends MIDIControllerProcessor {
    loadKernel() {
        this.kernel = new JX3PKernel()
    }
}

try {
    // @ts-ignore
    audioWorkletGlobalScope.registerProcessor(moduleId, MicrokorgProcessor);
} catch (error) {  
}