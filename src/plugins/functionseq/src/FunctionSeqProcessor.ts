import { WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope, WamParameterConfiguration } from "@webaudiomodules/api";

type ParameterDefinition = {
    id: string
    config: WamParameterConfiguration
}




type FunctionSequencer = {
    parameters?(): ParameterDefinition[]
    onTick?(ticks: number, params: Record<string, any>): {note: number, velocity: number, duration: number}[]
}

const getFunctionSequencerProcessor = (moduleId: string) => {
    const PPQN = 96
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

    class FunctionSequencerProcessor extends DynamicParameterProcessor {
        lastTime: number
        proxyId: string
        ticks: number
        function: FunctionSequencer
        transportData?: WamTransportData
        parameterIds: string[] = []

        count = 0;

        /**
         * Implement custom DSP here.
         * @param {number} startSample beginning of processing slice
         * @param {number} endSample end of processing slice
         * @param {Float32Array[][]} inputs
         * @param {Float32Array[][]} outputs
         */
        _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
            // @ts-ignore
            const { currentTime } = audioWorkletGlobalScope;
            
            if (!this.transportData) {
                return
            }

            if (!this.function) {
                return
            }

            if (this.transportData!.playing && currentTime >= this.transportData!.currentBarStarted) {
                var timeElapsed = currentTime - this.transportData!.currentBarStarted
                var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
                var tickPosition = Math.floor(beatPosition * PPQN)

                if (this.ticks != tickPosition) {
                    let secondsPerTick = 1.0 / ((this.transportData!.tempo / 60.0) * PPQN);
                    this.ticks = tickPosition;
                    try {
                        if (this.function.onTick) {
                            let params: any = {}
                            for (let id of this.parameterIds) {
                                params[id] = this._parameterInterpolators[id].values[startSample]
                            }
                            var notes = this.function.onTick(this.ticks, params)
                            
                            if (notes) {
                                for (let note of notes) {
                                    this.emitEvents(
                                        { type: 'wam-midi', time: currentTime, data: { bytes: [MIDI.NOTE_ON, note.note, note.velocity] } },
                                        { type: 'wam-midi', time: currentTime+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF, note.note, note.velocity] } }
                                    )
                                }
                            }
                        }
                        
                    } catch (e) {
                        this.port.postMessage({source: "functionSeq", action:"error", error: e.toString()})
                        this.function = undefined
                    }
                }
            }

            return;
        }

        /**
         * Messages from main thread appear here.
         * @param {MessageEvent} message
         */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.action == "function") {
                try {
                    this.function = new Function(message.data.code)()
                    if (!this.function.onTick) {
                        throw new Error("onTick function missing")
                    }
                    if (!!this.function.parameters) {
                        let parameters = this.function.parameters()

                        let map: Record<string, WamParameterConfiguration> = {}
                        this.parameterIds = []

                        for (let p of parameters) {
                            this.validateParameter(p)

                            map[p.id] = p.config
                            this.parameterIds.push(p.id)
                        }

                        this.port.postMessage({source: "functionSeq", action:"newParams", params: parameters})

                        this.updateParameters(map)
                    } else {
                        console.warn("parameters() function missing, sequencer has no parameters.")
                    }
                } catch(e) {
                    this.port.postMessage({source: "functionSeq", action:"error", error: e.toString()})
                    this.function = undefined
                }
            } else {
                // @ts-ignore
                super._onMessage(message)
            }
        }

        _onTransport(transportData: WamTransportData) {
            this.transportData = transportData
        }

        validateParameter(p: ParameterDefinition) {
            if (p.id === undefined || p.config === undefined) {
                throw new Error(`Invalid parameter ${p}: must have id and config defined`)
            }
            if (p.id.length == 0) {
                throw new Error("Invalid parameter: id must be string and not blank")
            }
            if (['float', 'int', 'boolean','choice'].findIndex(t => t == p.config.type) == -1) {
                throw new Error(`Invalid parameter type ${p.config.type}`)
            }
        }
    }

    try {
        registerProcessor('TomBurnsFunctionSequencer', FunctionSequencerProcessor as typeof WamProcessor);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
    }
}

export default getFunctionSequencerProcessor