import WamParameter from "sdk/src/WamParameter.js"
// @ts-ignore
globalThis.WamParameter = WamParameter;

import WamParameterInterpolator from "sdk/src/WamParameterInterpolator"
import WamProcessor from "sdk/src/WamProcessor";

// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import WamParameterInfo from "sdk/src/WamParameterInfo";
import { AudioParamDescriptor, WamMidiEvent, WamParameterInfoMap } from "sdk/src/api/types";
import { InstrumentDefinition } from "./InstrumentDefinition";

interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
    name: string,
    processorCtor: (new (
        options?: AudioWorkletNodeOptions
    ) => AudioWorkletProcessor) & {
        parameterDescriptors?: AudioParamDescriptor[];
    }
): undefined;

const audioWorkletGlobalScope = globalThis;

// other variables that could be included:
// - renderAhead: number - how far into the future should plugins render?

class ExternalInstrumentProcessor extends WamProcessor {
    _generateWamParameterInfo(): WamParameterInfoMap {
        if (!this.instrument) {
            return {}
        }

        let result: WamParameterInfoMap = {}
        this.instrument.midiCCs.map(cc => {
            result[cc.name] = new WamParameterInfo(cc.name, {
                type: "int",
                label: cc.name,
                minValue: cc.minValue ? cc.minValue : 0,
                maxValue: cc.maxValue ? cc.maxValue : 127,
                defaultValue: cc.startValue ? cc.startValue : 0,
            })
        })

        return result
    }

    lastTime: number
    proxyId: string
    heldNotes: number[][]
    instrument?: InstrumentDefinition

	constructor(options: any) {
		super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

        // @ts-ignore
        const { webAudioModules } = audioWorkletGlobalScope;

        this.heldNotes = []
        this.heldNotes.fill([], 0, 128)

        // @ts-ignore
        if (globalThis.WamProcessors) globalThis.WamProcessors[instanceId] = this;
        // @ts-ignore
		else globalThis.WamProcessors = { [instanceId]: this };

        super.port.addEventListener("message", (ev) => {
            console.log("Processor side: ", ev.data)
            if (ev.data.me) {
                console.log("Processor side: ", ev.data)
                if (ev.data.message == "instrument") {
                    console.log("Loading instrument")
                    this.instrument = new InstrumentDefinition(
                        ev.data.name, 
                        ev.data.cc,
                        ev.data.notes)
                }
            }
        })

        super.port.postMessage({
            me: true,
            message: "hello"
        })
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
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;

		return;
	}

    _onMidi(midiData: any) {   
        this.emitEvents(
            {type:"wam-midi", time: 0, data: midiData}
        )
    }
}

try {
	registerProcessor('Tom BurnsExternal Instrument', ExternalInstrumentProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
