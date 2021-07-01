import { WamTransportEvent, WamTransportEvent2 } from "../../sdk/src/api/types";
import { MIDI } from "../../shared/midi";
import { Clip, PPQN } from "./Clip";

import {debug} from "debug"
var logger = debug("plugin:pianoroll:processor")

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

class PianoRollProcessor extends AudioWorkletProcessor {
	// @ts-ignore
	static get parameterDescriptors() {
		return [
            {
                name: 'destroyed',
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            }
        ];
	}

    lastTime: number
    ticks: number
    proxyId: string
    lastBPM: number
    secondsPerTick: number

    clips: Map<string, Clip>
    pendingClipChange?: {id: string, timestamp: number} 
    currentClipId: string

    futureEvents: any[]

	constructor(options: any) {
		super(options);
		this.proxyId = options.processorOptions.proxyId;
		this.lastTime = null;
		this.ticks = -1;
        this.clips = new Map()
        this.currentClipId = ""

        this.port.onmessage = (ev) => {
            logger("Received message %o", ev.data)

            if (ev.data.action == "clip") {
                let clip = new Clip(ev.data.id, ev.data.state)
                this.clips.set(ev.data.id, clip)
            } else if (ev.data.action == "play") {
                this.pendingClipChange = {
                    id: ev.data.id,
                    timestamp: 0,
                }
            }
        }
	}

	get proxy() {
        // @ts-ignore
		const { webAudioModules } = audioWorkletGlobalScope;
		return webAudioModules?.processors[this.proxyId];
	}

	/**
	 * Main process
	 *
	 * @param {Float32Array[][]} inputs
	 * @param {Float32Array[][]} outputs
	 * @param {Record<P, Float32Array>} parameters
	 */
     process (inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
		const destroyed = parameters.destroyed[0];
		if (destroyed) return false;
		if (!this.proxy) return true;

        // @ts-ignore
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;

        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id
            this.pendingClipChange = undefined
        }

        let clip = this.clips.get(this.currentClipId)
        if (!clip) return true;

        var transportEvents = webAudioModules.getTransportEvents(currentTime, currentTime) as WamTransportEvent2[]
		if (transportEvents.length == 0) {
			return true
		}

		var transport = transportEvents[0]
		
		if (transport.playing) {
			var barPosition = webAudioModules.getBarPosition(currentTime)
			var beatPosition = barPosition * transport.beatsPerBar

            var tickPosition = Math.floor(beatPosition * PPQN)
            let clipPosition = tickPosition % clip.state.length;

            if (this.ticks != clipPosition) {
                let secondsPerTick = 1.0 / ((transport.start.bpm / 60.0) * PPQN);

                this.ticks = clipPosition;
                clip.notesForTick(clipPosition).forEach(note => {
                    logger("sending MIDI: %o", note)

                    this.proxy.emitEvents(
                        { type: 'midi', time: currentTime, data: { bytes: [MIDI.NOTE_ON, note.number, note.velocity] } },
                        { type: 'midi', time: currentTime+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF, note.number, note.velocity] } }
                    )
                })
            }
		}
		
		return true;
	}
}

try {
	registerProcessor('pianoroll-processor', PianoRollProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
