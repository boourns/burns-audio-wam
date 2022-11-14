import { time } from "lib0"
import { MIDI } from "../../shared/midi"
import {Clip} from "./Clip"

type NoteState = {
   onTimestamp?: number
   onVelocity?: number
}

export class MIDINoteRecorder {
    states: NoteState[]
    channel: number

    addNote: (tick: number, number: number, duration: number, velocity: number) => void
    getClip: () => Clip

    constructor(getClip: () => Clip, addNote: (tick: number, number: number, duration: number, velocity: number) => void) {
        this.getClip = getClip
        this.addNote = addNote
        this.states = []
        for (let i = 0; i < 128; i++) {
            this.states.push({})
        }
        this.channel = -1
    }

    onMIDI(event: number[], timestamp: number) {
        let isNoteOn = (event[0] & 0xF0) == MIDI.NOTE_ON
        let isNoteOff = (event[0] & 0xF0) == MIDI.NOTE_OFF && (event[0] & 0x0f) == this.channel

        // check channel
        if ((isNoteOn || isNoteOff) && this.channel != -1 && (event[0] & 0x0f) != this.channel) {
            isNoteOn = false
            isNoteOff = false
        }

        if (isNoteOn && event[2] == 0) {
            // treat note on with 0 velocity as note off (it's a thing)
            isNoteOn = false
            isNoteOff = true
        }

        const state = this.states[event[1]]!

        if (isNoteOff && state.onTimestamp !== undefined) {
            this.finalizeNote(event[1], timestamp)
        }

        if (isNoteOn && state.onTimestamp !== undefined) {
            this.finalizeNote(event[1], timestamp)
        }

        if (isNoteOn) {
            this.states[event[1]] = {
                onTimestamp: timestamp,
                onVelocity: event[2]
            }
        }
    }

    finalizeAllNotes(finalTimestamp: number) {
        for (let i = 0; i < 128; i++) {
            if (this.states[i].onTimestamp !== undefined) {
                this.finalizeNote(i, finalTimestamp)
            }
        }
    }

    finalizeNote(note: number, timestamp: number) {
        const state = this.states[note]!

        this.addNote(
            state.onTimestamp,
            note,
            timestamp - state.onTimestamp,
            state.onVelocity
        )
        this.states[note] = {}
    }
}