import { WamMidiData, WamMidiEvent } from "@webaudiomodules/api"

export interface MIDIMessager {
    toMIDI(channel: number, value: number): WamMidiEvent[]
    ingestMIDI(currentChannel: number, currentValue: number, event: WamMidiData): number | undefined
}

export const MIDI_CC = 0xB0

export class ControlChangeMessager implements MIDIMessager {
    ccNumber: number

    constructor(ccNumber: number) {
        this.ccNumber = ccNumber
    }

    ingestMIDI(currentChannel: number, currentValue: number, event: WamMidiData): number | undefined {
        if (
            (currentChannel < 0 && (event.bytes[0] & 0xf0) == MIDI_CC) ||
            ((event.bytes[0] == MIDI_CC + currentChannel))) {
                if (event.bytes[1] == this.ccNumber) {
                    return event.bytes[2]
                }
        }

        return undefined
    }

    toMIDI(channel: number, value: number): WamMidiEvent[] {
        return [
            {
                type: "wam-midi",
                data: {
                    bytes: [MIDI_CC+channel, this.ccNumber, value]
                }
            }
        ]
    }
}