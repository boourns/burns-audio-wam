import { WamEvent, WamMidiData, WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

export type ExternalInstrumentConfig = {
    midiPassThrough: "off" | "notes" | "all"
}

const getMIDIDebugProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
 	const {
 		WamProcessor,
 		WamParameterInfo,
 	} = ModuleScope;

    class MIDIDebugProcessor extends WamProcessor {
        midiChannel: number
        count = 0

        constructor(options: any) {
            super(options)
        }
        
        /**
         * Implement custom DSP here.
         * @param {number} startSample beginning of processing slice
         * @param {number} endSample end of processing slice
         * @param {Float32Array[][]} inputs
         * @param {Float32Array[][]} outputs
         */
        _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
            return;
        }

        /**
         * Messages from main thread appear here.
         * @param {MessageEvent} message
         */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.source == "midi") {
                const { currentTime } = audioWorkletGlobalScope;

                console.log("processor emitting midi: ", message.data)

                this.emitEvents(
                    { type: 'wam-midi', time: currentTime, data: { bytes: message.data.bytes } }
                )

            } else {
                super._onMessage(message)
            }
        }

        _onTransport(transportData: WamTransportData) {
            this.transportData = transportData
        }
    }

    try {
        console.log("HERE!")
        registerProcessor('SequencerPartyMIDIDebug', MIDIDebugProcessor as typeof WamProcessor);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
    }
}

export default getMIDIDebugProcessor
