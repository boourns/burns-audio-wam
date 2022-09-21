import { WamMidiData, WamMidiEvent } from "@webaudiomodules/api"
import { MIDIMessager } from "./ControlChangeMessager"

export const MIDI_CC = 0xB0

const RPNCCs = [
    6, /* set value (msb) */
    38, /* set value (lsb) */
    96, /* increment */
    97, /* decrement */
    98, /* NRPN (lsb) */
    99, /* NRPN (msb) */
    100, /* RPN (lsb) */
    101 /* RPN (msb) */
]

export class NRPNMSBMessager implements MIDIMessager {
    registered: boolean
    lsb: number
    msb: number

    lsbCorrect: boolean
    msbCorrect: boolean

    targetLSBCC: number
    targetMSBCC: number

    constructor(registered: boolean, msb: number, lsb: number) {
        this.registered = registered
        this.lsb = lsb
        this.msb = msb
        if (registered) {
            this.targetLSBCC = 100
            this.targetMSBCC = 101
        } else {
            this.targetLSBCC = 98
            this.targetMSBCC = 99
        }
    }

    ingestMIDI(currentChannel: number, currentValue: number, event: WamMidiData): number | undefined {
        if (currentChannel < 0 && (event.bytes[0] & 0xf0) != MIDI_CC) {
            // OMNI channel, but not MIDI_CC
            return undefined
        }

        if (currentChannel >= 0 && event.bytes[0] != MIDI_CC + currentChannel) {
            // not CC or not correct channel
            return undefined
        }

        if (!RPNCCs.includes(event.bytes[1])) {
            // not an RPN or NRPN CC, skip further processing
            return undefined
        }

        // definitely a CC
        if (event.bytes[1] == this.targetLSBCC) {
            // setting the RPN LSB
            this.lsbCorrect = (event.bytes[2] == this.lsb)
            return undefined
        }

        // definitely a CC
        if (event.bytes[1] == this.targetMSBCC) {
            // setting the RPN LSB
            this.msbCorrect = (event.bytes[2] == this.msb)
            return undefined
        }

        if (!this.lsbCorrect || !this.msbCorrect) {
            // it is an RPN CC but we are not being addressed
            return undefined
        }

        if (event.bytes[1] == 96) {
            return currentValue + 1
        }
        if (event.bytes[1] == 97) {
            return currentValue - 1
        }

        // set MSB
        if (event.bytes[1] == 6) {
            return event.bytes[2]
        }

        return undefined
    }

    toMIDI(channel: number, value: number): WamMidiEvent[] {
        return [
            {
                type: "wam-midi",
                data: {
                    bytes: [MIDI_CC+channel, this.targetLSBCC, this.lsb]
                }
            },
            {
                type: "wam-midi",
                data: {
                    bytes: [MIDI_CC+channel, this.targetMSBCC, this.msb]
                }
            },
            {
                type: "wam-midi",
                data: {
                    bytes: [MIDI_CC+channel, 6, value]
                }
            }
        ]
    }
}