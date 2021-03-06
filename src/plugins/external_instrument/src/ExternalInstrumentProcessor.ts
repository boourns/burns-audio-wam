import { WamEvent, WamMidiData, WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope, WamParameterConfiguration } from "@webaudiomodules/api";
import { InstrumentDefinition, InstrumentKernelType, MIDIControl } from "./InstrumentDefinition";

export type ExternalInstrumentConfig = {
    channel: number,
    midiPassThrough: "off" | "notes" | "all",
    learn: boolean,
}

const getExternalInstrumentProcessor = (moduleId: string) => {
    // @ts-ignore

    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
 	const {
 		WamProcessor,
 		WamParameterInfo,
 	} = ModuleScope;

    const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor
    const InstrumentKernel = ModuleScope.InstrumentKernel

    class ExternalInstrumentProcessor extends DynamicParameterProcessor {
        instrumentDefinition: InstrumentDefinition
        kernel: InstrumentKernelType
        count = 0
        config: ExternalInstrumentConfig

        constructor(options: any) {
            super(options)

            this.instrumentDefinition = {
                controlGroups: []
            }

            this.midiChannel = 0
            this.config = {
                channel: 0,
                midiPassThrough: "all",
                learn: true,
            }

            this.loadKernel()
        }

        loadKernel() {
            this.kernel = new InstrumentKernel(this.instrumentDefinition, this.config.channel, this.kernel)
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

            if (this.kernel) {
                let params: Record<string, number> = {}

                for (let control of this.kernel.controls) {
                    const p = this._parameterInterpolators[control.id]
                    if (p) {
                        params[control.id] = Math.round(p.values[startSample])
                    }
                }

                const messages = this.kernel.emitEvents(params) as WamEvent[]

                this.emitEvents(...messages)
            } else {
                console.log("no kernel")
            }

            return;
        }

        /**
         * Messages from main thread appear here.
         * @param {MessageEvent} message
         */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.source == "def") {
                console.log("Received instrument definition! ", JSON.stringify(message.data.def))

                this.instrumentDefinition = message.data.def

                this.loadKernel()
            } else if (message.data && message.data.source == "config") {
                this.config = message.data.config
            } else {
                super._onMessage(message)
            }
        }

        _onMidi(midiData: WamMidiData) {
            const { currentTime } = audioWorkletGlobalScope;

            const result = this.kernel.ingestMidi(midiData)
            if (result) {
                if (result[0] == "wam") {
                    console.log("emitting ", result[1])
                    this.scheduleEvents({...result[1], time: currentTime})
                } else if (result[0] == "port") {
                    this.port.postMessage(result[1])
                }
            }

            this.emitEvents({type:"wam-midi", data: midiData})
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