import { MIDI } from "../../shared/midi";

import {debug} from "debug"
import { WamMidiEvent, WamTransportEvent2 } from "../../sdk/src/api/types";

import WamParameterInterpolator from "../../sdk/src/WamParameterInterpolator"
import {WamParameterNoSab, WamParameterSab} from "../../sdk/src/WamParameter"
import WamProcessor from "../../sdk/src/WamProcessor";

// @ts-ignore
import wamEnvProcessor from "../../sdk/src/WamEnv.js";

const PPQN = 96

// @ts-ignore
globalThis.WamParameterNoSab = WamParameterNoSab
// @ts-ignore
globalThis.WamParameterSab = WamParameterSab
// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import WamParameterInfo from "../../sdk/src/WamParameterInfo";

var logger = debug("plugin:functionSeq:processor")

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

export type FunctionSequencer = {
    onTick?(ticks: number): {note: number, velocity: number, duration: number}[]
}

class FunctionSequencerProcessor extends WamProcessor {
	// @ts-ignore
    static generateWamParameterInfo() {
        return {
        }
    }

    lastTime: number
    proxyId: string
    destroyed: boolean
    ticks: number
    function: FunctionSequencer

	constructor(options: any) {
		super(options);
        this.destroyed = false

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

        // @ts-ignore
        const { webAudioModules } = audioWorkletGlobalScope;

        // @ts-ignore
        if (globalThis.WamProcessors) globalThis.WamProcessors[instanceId] = this;
        // @ts-ignore
		else globalThis.WamProcessors = { [instanceId]: this };

        // this.port.onmessage = (ev) => {
        //     console.log("Received message %o", ev.data)

        //     if (ev.data.action == "function") {
        //         console.log("HERE - received event ", ev.data)
        //         this.function = new Function()
        //     } 
        // }

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

        // @ts-ignore
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;

        var transportEvents = webAudioModules.getTransportEvents(currentTime, currentTime) as WamTransportEvent2[]
		if (transportEvents.length == 0) {
			return true
		}

        if (!this.function) {
            return true
        }

		var transport = transportEvents[0]
		
		if (transport.playing) {
			var barPosition = webAudioModules.getBarPosition(currentTime)
			var beatPosition = barPosition * transport.beatsPerBar

            var tickPosition = Math.floor(beatPosition * PPQN)

            if (this.ticks != tickPosition) {
                let secondsPerTick = 1.0 / ((transport.start.bpm / 60.0) * PPQN);
                this.ticks = tickPosition;
                try {
                    if (this.function.onTick) {
                        var notes = this.function.onTick(this.ticks)

                        if (notes) {
                            for (let note of notes) {
                                this.emitEvents(
                                    { type: 'midi', time: currentTime, data: { bytes: [MIDI.NOTE_ON, note.note, note.velocity] } },
                                    { type: 'midi', time: currentTime+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF, note.note, note.velocity] } }
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

		return true;
	}

	/**
	 * Messages from main thread appear here.
	 * @param {MessageEvent} message
	 */
     _onMessage(message: any) {
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

    destroy() {
		this.destroyed = true;
		super.port.close();
	}
}

try {
	registerProcessor('TomBurnsFunctionSequencer', FunctionSequencerProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
