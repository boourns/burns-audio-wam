import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration } from "@webaudiomodules/api"
import { MIDIMessager } from "./ControlChangeMessager"
import { SynthParameter } from "./IntParameter"

export type SelectOption = {
    value: number
    label: string
}

export class BooleanParameter implements SynthParameter {
    id: string
    messager: MIDIMessager
    label: string

    value: number
    defaultValue: number
    onMidiValue: number
    offMidiValue: number

    midiDirty: boolean
    automationDirty: boolean

    constructor(id: string, label: string, messager: MIDIMessager, defaultValue: number, offMidiValue: number, onMidiValue: number) {
        this.id = id
        this.label = label
        this.messager = messager
        this.defaultValue = defaultValue
        this.onMidiValue = onMidiValue
        this.offMidiValue = offMidiValue
        this.value = this.defaultValue
    }

    toWAM(): WamParameterConfiguration {
        return {
            label: this.label,
            type: "boolean",
            defaultValue: this.defaultValue,
            minValue: 0,
            maxValue: 1,
        }
    }

    ingestMIDI(currentChannel: number, event: WamMidiData): boolean {
        let currentMidiValue = this.value ? this.onMidiValue : this.offMidiValue
        let newMidiValue = this.messager.ingestMIDI(currentChannel, currentMidiValue, event)

        if (newMidiValue === undefined) {
            return false
        }

        if (newMidiValue === currentMidiValue) {
            return false
        }

        this.value = (newMidiValue == this.onMidiValue) ? 1 : 0

        this.automationDirty = true

        return true
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

    midiMessage(channel: number, force: boolean = false): WamMidiEvent[] {
        if (!this.midiDirty && !force) {
            return []
        }
        
        this.midiDirty = false

        const midiValue = this.value ? this.onMidiValue : this.offMidiValue

        return this.messager.toMIDI(channel, midiValue)
    }

    sysexNeeded(force: boolean = false): boolean {
        if (!this.midiDirty && !force) {
            return false
        }

        return this.messager.sysexNeeded()
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
