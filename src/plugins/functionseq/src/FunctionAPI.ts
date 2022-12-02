import { AudioWorkletGlobalScope } from "@webaudiomodules/api"
import { FunctionKernel } from "./FunctionKernel"
import { FunctionSequencerProcessor, MIDI } from "./FunctionSeqProcessor"
const PPQN = 96
let processor: FunctionSequencerProcessor
export let kernel: FunctionKernel

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

export function setProcessor(p: FunctionSequencerProcessor) {
    processor = p
}

export function setKernel(k: FunctionKernel) {
    kernel = k
}

export type NoteDefinition = {
    number: number
    name?: string
    blackKey: boolean
}

export class FunctionAPI {
    /**
     * emits a MIDI Note on message followed by a MIDI Note off message delayed by the duration
     * @param note {number} the MIDI note number, from 0-127
     * @param velocity {number} MIDI note on velocity, from 0-127
     * @param duration {number} the midi note duration, in seconds.
     * @param startTime {number} optionally set the starting time of the note, in relation to api.getCurrentTime()
     * */
    emitNote(note: number, velocity: number, duration: number, startTime?: number) {
        if (startTime === undefined) {
            startTime = audioWorkletGlobalScope.currentTime
        }

        this.emitMidiEvent([MIDI.NOTE_ON, note, velocity], startTime)
        this.emitMidiEvent([MIDI.NOTE_OFF, note, velocity], startTime+duration)
    }

    emitMidiEvent(bytes: number[], eventTime: number) {
        processor.emitEvents(
            { type: 'wam-midi', time: eventTime, data: { bytes } }
        )
    }

    /**
     * returns the current time
     * @returns {number} the current audioContext time, in seconds
     */
    getCurrentTime(): number {
        return audioWorkletGlobalScope.currentTime
    }

    /**
     * returns the duration, in seconds, for the input number of ticks
     * @param ticks {number} the number of ticks to convert to seconds
     */
    getTickDuration(ticks: number): number {
        return ticks * 1.0 / ((kernel.transport.tempo / 60.0) * PPQN);
    }

    /**
     * Set (or unset) a list of named MIDI notes.  Used to inform earlier MIDI processors what MIDI notes are valid.
     * @param noteList {NoteDefinition[]} a list of midi notes this processor accepts.  Set to undefined to clear the custom note list.
     */
    setCustomNoteList(noteList?: NoteDefinition[]) {
        processor.port.postMessage({source: "functionSeq", action:"noteList", noteList})
    }
}