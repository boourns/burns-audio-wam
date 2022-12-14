import { WamTransportData } from "@webaudiomodules/api"
import { MIDI } from "../../shared/midi"
import {Clip, PPQN} from "./Clip"

type NoteState = {
   onTick?: number
   onVelocity?: number
}

export class MIDINoteRecorder {
    states: NoteState[]
    channel: number
    transportData?: WamTransportData

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
        let isNoteOff = (event[0] & 0xF0) == MIDI.NOTE_OFF

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

        const tick = this.getTick(timestamp)

        if (isNoteOff && state.onTick !== undefined) {
            this.finalizeNote(event[1], tick)
        }

        if (isNoteOn && state.onTick !== undefined) {
            this.finalizeNote(event[1], tick)
        }

        if (isNoteOn) {
            this.states[event[1]] = {
                onTick: tick,
                onVelocity: event[2]
            }
        }
    }

    finalizeAllNotes(finalTick: number) {
        for (let i = 0; i < 128; i++) {
            if (this.states[i].onTick !== undefined) {
                this.finalizeNote(i, finalTick)
            }
        }
    }

    finalizeNote(note: number, tick: number) {
        const state = this.states[note]!

        if (tick > state.onTick) {
            this.addNote(
                state.onTick,
                note,
                tick - state.onTick,
                state.onVelocity
            )
        }
        
        this.states[note] = {}
    }

    getTick(timestamp: number) {
        var timeElapsed = timestamp - this.transportData!.currentBarStarted
        var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo/60.0) * timeElapsed)
        var tickPosition = Math.floor(beatPosition * PPQN)

        return tickPosition % this.getClip().state.length;
    }
}