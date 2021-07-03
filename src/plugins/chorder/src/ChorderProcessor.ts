import { MIDI } from "../../shared/midi";

import {debug} from "debug"
import { WamMidiEvent } from "sdk/src/api/types";

import WamParameterInterpolator from "sdk/src/WamParameterInterpolator"
//import {WamParameterNoSab, WamParameterSab} from "sdk/src/WamParameter"
import WamProcessor from "sdk/src/WamProcessor";

// @ts-ignore
import wamEnvProcessor from "../../sdk/src/WamEnv.js";

// @ts-ignore
//globalThis.WamParameterNoSab = WamParameterNoSab
// @ts-ignore
//globalThis.WamParameterSab = WamParameterSab
// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import WamParameterInfo from "sdk/src/WamParameterInfo";

var logger = debug("plugin:chorder:processor")

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

class ChorderProcessor extends WamProcessor {
	// @ts-ignore
    static generateWamParameterInfo() {
        return {
            offset1: new WamParameterInfo('offset1', {
				type: 'int',
				label: 'Offset 1',
				defaultValue: 0,
                minValue: -24,
                maxValue: 24
			}),
            offset2: new WamParameterInfo('offset2', {
				type: 'int',
				label: 'Offset 2',
				defaultValue: 0,
                minValue: -24,
                maxValue: 24
			}),
            offset3: new WamParameterInfo('offset3', {
				type: 'int',
				label: 'Offset 3',
				defaultValue: 0,
                minValue: -24,
                maxValue: 24
			}),
            offset4: new WamParameterInfo('offset4', {
				type: 'int',
				label: 'Offset 4',
				defaultValue: 0,
                minValue: -24,
                maxValue: 24
			}),
            offset5: new WamParameterInfo('offset5', {
				type: 'int',
				label: 'Offset 5',
				defaultValue: 0,
                minValue: -24,
                maxValue: 24
			}),
            offset6: new WamParameterInfo('offset6', {
				type: 'int',
				label: 'Offset 6',
				defaultValue: 0,
                minValue: -24,
                maxValue: 24
			}),
        }
    }

    lastTime: number
    proxyId: string
    destroyed: boolean

    heldNotes: number[][]
    offsets: number[]

	constructor(options: any) {
		super(options);
        this.destroyed = false

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

        super.port.start();
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
		if (this.destroyed) return false;

        this.offsets = [
            // @ts-ignore
            ...new Set([this._parameterInterpolators.offset1.values[startSample],       
            // @ts-ignore
            this._parameterInterpolators.offset2.values[startSample],
            // @ts-ignore
            this._parameterInterpolators.offset3.values[startSample],
            // @ts-ignore
            this._parameterInterpolators.offset4.values[startSample],
            // @ts-ignore            
            this._parameterInterpolators.offset5.values[startSample],
            // @ts-ignore
            this._parameterInterpolators.offset6.values[startSample]])
        ].filter(n => n != 0)

        // @ts-ignore
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;

		return true;
	}

    _onMidi(midiData: any) {        
        // @ts-ignore
        const { currentTime } = audioWorkletGlobalScope;

        // /* eslint-disable no-lone-blocks */
        const bytes = midiData.bytes;
        let type = bytes[0] & 0xf0;
        const channel = bytes[0] & 0x0f;
        const data1 = bytes[1];
        const data2 = bytes[2];

        if (type === 0x90 && data2 === 0) type = 0x80;

        switch (type) {
        case 0x80: { /* note off */
            this.chordOff(data1, data2)
        } break;
        case 0x90: { /* note on */
            this.chordOn(data1, data2, this.offsets)
        } break;
        
        default: { 
            this.emitEvents(
                {type:"wam-midi", time: currentTime, data: midiData}
            )
         } break;
        }
    }

    chordOn(note: number, velocity: number, offsets: number[]) {
        // @ts-ignore
        const { currentTime } = audioWorkletGlobalScope;

        let notes = []
        notes.push(note)
        for (let offset of offsets) {
            let n = note + offset
            if (n < 128 && n >= 0) {
                notes.push(n)
            }
        }

        let events: WamMidiEvent[] = notes.map(n => {
            return {type:"wam-midi", time: currentTime, data: {bytes: [0x90, n, velocity]}}
        })

        this.emitEvents(
            ...events
        )

        this.heldNotes[note] = notes
    }

    chordOff(note: number, velocity: number) {
        // @ts-ignore
        const { currentTime } = audioWorkletGlobalScope;

        let notes = this.heldNotes[note]

        let events: WamMidiEvent[] = notes.map(n => {
            return {type:"wam-midi", time: currentTime, data: {bytes: [0x80, n, velocity]}}
        })

        this.emitEvents(
            ...events
        )

        this.heldNotes[note] = []
    }

    destroy() {
		this.destroyed = true;
		super.port.close();
	}
}

try {
	registerProcessor('TomBurnsChorder', ChorderProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
