import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration } from "@webaudiomodules/api"
import { MIDIMessager } from "./ControlChangeMessager"

const MIDI_CC = 0xB0

export interface SynthParameter {
    id: string
    label: string
    toWAM(): WamParameterConfiguration
    ingestMIDI(currentChannel: number, event: WamMidiData): boolean
    updateFromSysex(value: number): void
    parameterUpdate(newValue: number): boolean
    sysexNeeded(force?: boolean): boolean
    midiMessage(channel: number, force?: boolean): WamMidiEvent[]
    automationMessage(force?: boolean): WamAutomationEvent | undefined
    
    value: number
}

export class IntParameter implements SynthParameter {
    id: string
    label: string
    messager: MIDIMessager
    defaultValue: number
    minValue: number
    maxValue: number
    value: number

    midiDirty: boolean
    automationDirty: boolean

    constructor(id: string, label: string, messager: MIDIMessager, defaultValue: number, minValue: number = 0, maxValue: number = 127) {
        this.id = id
        this.label = label
        this.messager = messager
        this.defaultValue = defaultValue
        this.minValue = minValue
        this.maxValue = maxValue
        this.value = this.defaultValue
    }

    toWAM(): WamParameterConfiguration {
        return {
            type: "int",
            label: this.label,
            defaultValue: this.defaultValue,
            minValue: this.minValue,
            maxValue: this.maxValue,
        }
    }

    ingestMIDI(currentChannel: number, event: WamMidiData): boolean {
        let currentValue = this.value
        if (this.minValue < 0) {
            currentValue += (this.minValue*-1)
        }
        let value = this.messager.ingestMIDI(currentChannel, this.value, event)

        if (value === undefined) {
            return false
        }
        if (value === currentValue) {
            return false
        }

        if (this.minValue < 0) {
            this.value = value + this.minValue
        } else {
            this.value = value
        }

        if (value > this.maxValue) {
            value = this.maxValue
        }
        if (value < this.minValue) {
            value = this.minValue
        }
        
        this.automationDirty = true

        return true
    }

    updateFromSysex(value: number) {
        this.value = value
        this.automationDirty = true
    }

    sysexNeeded(force: boolean = false): boolean {
        if (!this.midiDirty && !force) {
            return false
        }

        return this.messager.sysexNeeded()
    }

    parameterUpdate(newValue: number): boolean {
        const dirty = this.value != newValue

        if (dirty) {
            this.midiDirty = true
        }

        this.value = newValue

        return dirty
    }

    midiMessage(channel: number, force: boolean = false): WamMidiEvent[] {
        if (!this.midiDirty && !force) {
            return []
        }

        this.midiDirty = false
        
        let value = this.value
        if (this.minValue < 0) {
            value -= this.minValue
        }
        
        return this.messager.toMIDI(channel, value)
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
