import { AudioWorkletGlobalScope } from "@webaudiomodules/api";
import { MicrokorgKernel } from "./MicrokorgKernel";

const moduleId = "SequencerPartyMicrokorg Editor"
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

const scope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const MIDIControllerProcessor = scope.MIDIControllerProcessor

class MicrokorgProcessor extends MIDIControllerProcessor {
    loadKernel() {
        this.kernel = new MicrokorgKernel()
        
    }
}

try {
    // @ts-ignore
    audioWorkletGlobalScope.registerProcessor(moduleId, MicrokorgProcessor);
} catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
}