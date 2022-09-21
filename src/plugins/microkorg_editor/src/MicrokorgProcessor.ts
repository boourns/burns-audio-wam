import { AudioWorkletGlobalScope } from "@webaudiomodules/api";
import { MicrokorgKernel } from "./MicrokorgKernel";

const moduleId = "SequencerPartyMicrokorg Editor"
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

let scope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

scope.MIDIControllerKernel = MicrokorgKernel

const DynamicParameterProcessor = scope.DynamicParameterProcessor

class MicrokorgProcessor extends DynamicParameterProcessor {

}

try {
    audioWorkletGlobalScope.registerProcessor(moduleId, MicrokorgProcessor);
} catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
}