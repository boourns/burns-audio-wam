import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration } from "@webaudiomodules/api"

const MIDI_CC = 0xB0

export class SimpleCCParameter {
    id: string
    label: string
    ccNumber: number
    defaultValue: number
    minValue: number
    maxValue: number
    value: number

    midiDirty: boolean
    automationDirty: boolean

    constructor(id: string, label: string, ccNumber: number, defaultValue: number, minValue: number = 0, maxValue: number = 127) {
        this.id = id
        this.label = label
        this.ccNumber = ccNumber
        this.defaultValue = defaultValue
        this.minValue = minValue
        this.maxValue = maxValue
        this.value = this.defaultValue
    }

    toWAM(): WamParameterConfiguration {
        return {
            type: "int",
            defaultValue: this.defaultValue,
            minValue: this.minValue,
            maxValue: this.maxValue,
        }
    }

    ingestMIDI(currentChannel: number, event: WamMidiData): boolean {
        if (
            (currentChannel < 0 && (event.bytes[0] & 0xf0) == MIDI_CC) ||
            ((event.bytes[0] == MIDI_CC + currentChannel))) {
                if (event.bytes[1] == this.ccNumber) {
                    if (this.value != event.bytes[2]) {
                        this.value = event.bytes[2]
                        this.automationDirty = true
                        return true
                    }
                }
        }

        return false
    }

    updateFromSysex(value: number) {
        this.value = value
        this.automationDirty = true
    }

    parameterUpdate(newValue: number): boolean {
        const dirty = this.value != newValue

        if (dirty) {
            this.midiDirty = true
        }

        this.value = newValue

        return dirty
    }

    midiMessage(channel: number, force: boolean = false): WamMidiEvent | undefined {
        if (!this.midiDirty && !force) {
            return undefined
        }

        this.midiDirty = false
        return {
            type: "wam-midi", 
            data: {
                bytes: [MIDI_CC + channel, this.ccNumber, this.value]
            }
        }
    }

    automationMessage(force: boolean = false): WamAutomationEvent | undefined {
        if (!this.automationDirty && !force) {
            return undefined
        }

        this.automationDirty = false

        return {
            type: "wam-automation",
            data: {
                id: this.id,
                value: this.value,
                normalized: false,
            }
         }
    }
}
