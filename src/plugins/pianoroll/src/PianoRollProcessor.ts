import { MIDI } from "../../shared/midi";
import { AudioWorkletGlobalScope, WamMidiData, WamTransportData } from "@webaudiomodules/api";
import { Clip } from "./Clip";
import { MIDINoteRecorder } from "./MIDINoteRecorder";
import { MIDIConfiguration } from "./MIDIConfiguration";

const moduleId = 'com.sequencerParty.pianoRoll'
export const PPQN = 24

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor

class PianoRollProcessor extends WamProcessor {
    _generateWamParameterInfo() {
        return {
        }
    }

    lastTime: number
    isPlaying: boolean

    ticks: number
    startingTicks: number

    proxyId: string

    secondsPerTick: number
    transportData?: WamTransportData
    count: number

    clips: Map<string, Clip>
    
    pendingClipChange?: {id: string, timestamp: number} 
    currentClipId: string

    futureEvents: any[]

    noteRecorder: MIDINoteRecorder
    midiConfig: MIDIConfiguration

	constructor(options: any) {
		super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

		this.lastTime = null;
		this.ticks = -1;
        this.clips = new Map()
        this.currentClipId = "default"
        this.count = 0
        this.isPlaying = false
        this.midiConfig = {
            hostRecordingArmed: false,
            pluginRecordingArmed: false,
            inputMidiChannel: -1,
            outputMidiChannel: 0,
        }

        this.noteRecorder = new MIDINoteRecorder(
            () => {
                return this.clips.get(this.currentClipId)
            },
            (tick: number, number: number, duration: number, velocity: number) => {
                super.port.postMessage({ event:"addNote", note: {tick, number, duration, velocity}})
            }
        )

        super.port.start();
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
        
        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id
            this.pendingClipChange = undefined
        }

        let clip = this.clips.get(this.currentClipId)
        if (!clip) {
            return
        }
        if (!this.transportData) {
            return
        }

        // lookahead
        var schedulerTime = currentTime + 0.05

        // did we just start playing? set ticks to the beginning of 'currentBar'
        if (!this.isPlaying && this.transportData.playing && this.transportData!.currentBarStarted <= currentTime) {
            this.isPlaying = true

            // current position in ticks = (current bar * beats per bar) * (ticks per beat) % (clip length in ticks)
            this.startingTicks = ((this.transportData!.currentBar * this.transportData!.timeSigNumerator) * PPQN)

            // rewind one tick so that on our first loop we process notes for the first tick
            this.ticks = this.startingTicks - 1
        }

        if (!this.transportData.playing && this.isPlaying) {
            this.isPlaying = false
        }

		if (this.transportData!.playing && this.transportData!.currentBarStarted <= schedulerTime) {
			var timeElapsed = schedulerTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
            var absoluteTickPosition = Math.floor(beatPosition * PPQN)

            let clipPosition = absoluteTickPosition % clip.state.length;

            if (this.recordingArmed && (this.ticks % clip.state.length) > clipPosition) {
                // we just circled back, so finalize any notes in the buffer
                this.noteRecorder.finalizeAllNotes(clip.state.length-1)
            }

            let secondsPerTick = 1.0 / ((this.transportData!.tempo / 60.0) * PPQN);

            while (this.ticks < absoluteTickPosition) {
                this.ticks = this.ticks + 1

                const tickMoment = this.transportData.currentBarStarted + ((this.ticks - this.startingTicks) * secondsPerTick)
                clip.notesForTick(this.ticks % clip.state.length).forEach(note => {

                    this.emitEvents(
                        { type: 'wam-midi', time: tickMoment, data: { bytes: [MIDI.NOTE_ON | this.midiConfig.outputMidiChannel, note.number, note.velocity] } },
                        { type: 'wam-midi', time: tickMoment+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF | this.midiConfig.outputMidiChannel, note.number, note.velocity] } }
                    )
                })
            }
		}

		return
	}

	/**
	 * Messages from main thread appear here.
	 * @param {MessageEvent} message
	 */
     async _onMessage(message: any): Promise<void> {
        if (message.data && message.data.action == "clip") {
            let clip = new Clip(message.data.id, message.data.state)
            this.clips.set(message.data.id, clip)
        } else if (message.data && message.data.action == "play") {
            this.pendingClipChange = {
                id: message.data.id,
                timestamp: 0,
            }
        } else if (message.data && message.data.action == "midiConfig") {
            this.midiConfig = message.data.config
            this.noteRecorder.channel = this.midiConfig.inputMidiChannel
        } else {
            super._onMessage(message)
        }
     }

    _onTransport(transportData: WamTransportData) {
        this.transportData = transportData
        this.noteRecorder.transportData = transportData
        this.isPlaying = false

        super.port.postMessage({
            event:"transport",
            transport: transportData
        })
    }

    _onMidi(midiData: WamMidiData) {        
        const { currentTime } = audioWorkletGlobalScope;

        // /* eslint-disable no-lone-blocks */
        const bytes = midiData.bytes;
        if (!(this.midiConfig.pluginRecordingArmed && this.midiConfig.hostRecordingArmed)) {
            return
        }
        if (!this.transportData?.playing || this.transportData!.currentBarStarted > currentTime) {
            return
        }
        
        this.noteRecorder.onMIDI(bytes, currentTime)
    }    
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, PianoRollProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
