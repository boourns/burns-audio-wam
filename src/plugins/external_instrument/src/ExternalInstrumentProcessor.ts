import { WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope, WamParameterConfiguration } from "@webaudiomodules/api";
import { InstrumentDefinition, MIDIControl } from "./InstrumentDefinition";

const getExternalInstrumentProcessor = (moduleId: string) => {
    class MIDI {
        static NOTE_ON = 0x90;
        static NOTE_OFF = 0x80;
        static CC = 0xB0;
    }
    
    // @ts-ignore

    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
 	const {
 		WamProcessor,
 		WamParameterInfo,
 	} = ModuleScope;

    const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor

    class ExternalInstrumentProcessor extends DynamicParameterProcessor {
        instrumentDefinition: InstrumentDefinition
        controlList: MIDIControl[]

        constructor(options: any) {
            super(options)

            this.instrumentDefinition = {
                controlGroups: []
            }
        }
        
        /**
         * Implement custom DSP here.
         * @param {number} startSample beginning of processing slice
         * @param {number} endSample end of processing slice
         * @param {Float32Array[][]} inputs
         * @param {Float32Array[][]} outputs
         */
        _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
            const { currentTime } = audioWorkletGlobalScope;

            for (let control of this.controlList) {
                
            }


            return;
        }

        /**
         * Messages from main thread appear here.
         * @param {MessageEvent} message
         */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.source == "def") {
                this.instrumentDefinition = message.data.def
                this.controlList = []
                for (let group of this.instrumentDefinition.controlGroups) {
                    for (let control of group.controls) {
                        this.controlList.push(control)
                    }
                }
            } else {
                super._onMessage(message)
            }
        }

        generateMidiFor(control: MIDIControl) {

        }

        _onMidi() {

        }

        _onTransport(transportData: WamTransportData) {
            this.transportData = transportData
        }
    }

    try {
        registerProcessor('SequencerPartyExternal Instrument', ExternalInstrumentProcessor as typeof WamProcessor);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
    }
}

export default getExternalInstrumentProcessor