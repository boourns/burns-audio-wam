import { WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope, WamMidiEvent } from "@webaudiomodules/api";

export type FunctionSequencer = {
    onTick?(ticks: number): {note: number, velocity: number, duration: number}[]
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

    class FunctionSequencerProcessor extends WamProcessor {
        // @ts-ignore
        _generateWamParameterInfo() {
            return {
            }
        }

        lastTime: number
        proxyId: string
        ticks: number
        function: FunctionSequencer
        transportData?: WamTransportData

        constructor(options: any) {
            super(options);

            const {
                moduleId,
                instanceId,
            } = options.processorOptions;

            // this.port.onmessage = (ev) => {
            //     console.log("Received message %o", ev.data)

            //     if (ev.data.action == "function") {
            //         console.log("HERE - received event ", ev.data)
            //         this.function = new Function()
            //     } 
            // }
        }

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

            if (this.transportData!.playing) {
                var timeElapsed = currentTime - this.transportData!.currentBarStarted
                var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
                var tickPosition = Math.floor(beatPosition * PPQN)

                if (this.ticks != tickPosition) {
                    let secondsPerTick = 1.0 / ((this.transportData!.tempo / 60.0) * PPQN);
                    this.ticks = tickPosition;
                    try {
                        if (this.function.onTick) {
                            var notes = this.function.onTick(this.ticks)
                            
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
                        this.port.postMessage({action:"error", error: e.toString()})
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
                } catch(e) {
                    this.port.postMessage({action:"error", error: e.toString()})
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
    }

    try {
        registerProcessor('TomBurnsFunctionSequencer', FunctionSequencerProcessor as typeof WamProcessor);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
    }
}

export default getFunctionSequencerProcessor