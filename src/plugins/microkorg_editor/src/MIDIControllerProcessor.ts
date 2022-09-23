import { WamEvent, WamMidiData, WamParameterInfoMap, WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope, WamParameterConfiguration } from "@webaudiomodules/api";
import type { MIDIControllerKernel } from "./MIDIControllerKernel"

export type MIDIControllerConfig = {
    channel: number,
    midiPassThrough: "off" | "notes" | "all",
}

export type MIDIControllerCounts = {
    sendMidi: number
}

const loadMIDIControllerProcessor = (moduleId: string) => {
    // @ts-ignore

    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
 	const {
 		WamProcessor,
 		WamParameterInfo,
 	} = ModuleScope;

    class MIDIControllerProcessor extends WamProcessor {
        kernel: MIDIControllerKernel
        kernelParam: Record<string, WamParameterConfiguration>
        config: MIDIControllerConfig
        counts: MIDIControllerCounts
        rxCounts: MIDIControllerCounts

        _generateWamParameterInfo(): WamParameterInfoMap {
            this.kernelParam = this.kernel.wamParameters()
            this.counts = {
                sendMidi: 0
            }
            this.rxCounts = {
                sendMidi: 0
            }

            let params: WamParameterInfoMap = {}
            for (let id of Object.keys(this.kernelParam)) {
                params[id] = new WamParameterInfo(id, this.kernelParam[id])
            }

            return params
        }

        constructor(options: any) {
            super(options)

            this.config = {
                channel: 0,
                midiPassThrough: "all",
            }

            this.loadKernel()
        }

        loadKernel(): MIDIControllerKernel {
            throw new Error("loadKernel() not implemented!")
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

                for (let id of Object.keys(this.kernelParam)) {
                    const p = this._parameterInterpolators[id]
                    if (p) {
                        params[id] = Math.round(p.values[startSample])
                    }
                }

                if (this.kernel.parameterUpdate(params)) {
                    // some parameters updated, send the MIDI events
                    this.emitEvents(...this.kernel.midiMessages(this.config.channel, false))
                }

                if (this.counts.sendMidi != this.rxCounts.sendMidi) {
                    // somebody (possibly remote) pressed sendMidi
                    this.emitEvents(...this.kernel.midiMessages(this.config.channel, true))
                    this.counts.sendMidi = this.rxCounts.sendMidi
                }
            } else {
                console.log("no kernel")
            }

            return;
        }

        _onMidi(midiData: WamMidiData) {
            const { currentTime } = audioWorkletGlobalScope;

            const result = this.kernel.ingestMIDI(midiData)
            
            if (result) {
                const messages = this.kernel.automationMessages(false)
                for (let message of messages) {                    
                    this.scheduleEvents({...message, time: currentTime})
                }
            } else {
                // only forward MIDI events we don't ingest
                this.emitEvents({type:"wam-midi", data: midiData})
            }
        }

        /**
         * Messages from main thread appear here.
        //  * @param {MessageEvent} message
        //  */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.action == "count") {
                if (message.data.count) {
                    this.rxCounts = message.data.count
                }
            } else if (message.data && message.data.action == "emit") {
                if (message.data.event) {
                    this.emitEvents(message.data.event)
                }
            } else {
                // @ts-ignore
                super._onMessage(message)
            }
        }

        _onTransport(transportData: WamTransportData) {
            this.transportData = transportData
        }
    }

    ModuleScope.MIDIControllerProcessor = MIDIControllerProcessor

    return MIDIControllerProcessor
}

export default loadMIDIControllerProcessor