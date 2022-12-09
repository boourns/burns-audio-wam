import { WamMidiData, WamTransportData } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope } from "@webaudiomodules/api";
import { FunctionKernel } from "./FunctionKernel";

const moduleId = "com.sequencerParty.functionSeq"
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

const PPQN = 96
export class MIDI {
    static NOTE_ON = 0x90;
    static NOTE_OFF = 0x80;
    static CC = 0xB0;
}

const { registerProcessor } = audioWorkletGlobalScope;

const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const {
    WamProcessor,
} = ModuleScope;

const DynamicParameterProcessor = ModuleScope.DynamicParameterProcessor

export class FunctionSequencerProcessor extends DynamicParameterProcessor {
    lastTime: number
    proxyId: string
    ticks: number
    function: FunctionKernel
    transportData?: WamTransportData

    count = 0

    constructor(options: any) {
        super(options)
        this.function = new FunctionKernel(this)
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
        
        if (!this.transportData) {
            return
        }

        if (this.transportData!.playing && currentTime >= this.transportData!.currentBarStarted) {
            var timeElapsed = currentTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
            var tickPosition = Math.floor(beatPosition * PPQN)

            if (this.ticks != tickPosition) {
                this.ticks = tickPosition;

                this.function.onTick(this.ticks)
            }
        }

        return;
    }

    /**
     * Messages from main thread appear here.
     * @param {MessageEvent} message
     */
    async _onMessage(message: any): Promise<void> {
        if (message.data && message.data.source == "function") {
            this.function.onMessage(message)
        } else if (message.data && message.data.source == "remoteUI") {
            this.function.uiController.onMessage(message)
        } else {
            if (message.data && message.data.request == "set/state") {
                if (!this.function.registerParametersCalled && message.data?.content?.state?.parameterValues) {
                    // we queue up any setState calls until the script registers parameters, and then we send them out.
                    // otherwise we drop initial state values saved in the script
                    this.function.cachedSetState.push(message.data.content.state.parameterValues)
                }
            }
            // @ts-ignore
            super._onMessage(message)
        }
    }

    _onTransport(transportData: WamTransportData) {
        this.transportData = transportData
        this.function.onTransport(transportData)
    }

    _onMidi(midiData: WamMidiData) {                
        this.function.onMidi(midiData)
    }
}

try {
    registerProcessor('com.sequencerParty.functionSeq', FunctionSequencerProcessor as typeof WamProcessor);
} catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
}