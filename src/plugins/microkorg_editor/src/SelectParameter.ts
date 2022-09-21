import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration } from "@webaudiomodules/api"
import { MIDIMessager } from "./ControlChangeMessager"
import { SynthParameter } from "./IntParameter"

export type SelectOption = {
    value: number
    label: string
}

export class SelectParameter implements SynthParameter {
    id: string
    messager: MIDIMessager
    label: string
    defaultValue: number

    options: SelectOption[]
    value: number

    midiDirty: boolean
    automationDirty: boolean

    constructor(id: string, label: string, messager: MIDIMessager, defaultValue: number, options: SelectOption[]) {
        this.id = id
        this.label = label
        this.messager = messager
        this.defaultValue = defaultValue
        this.options = options

        this.value = this.defaultValue
    }

    toWAM(): WamParameterConfiguration {
        return {
            type: "choice",
            defaultValue: this.defaultValue,
            choices: this.options.map(o => o.label)
        }
    }

    ingestMIDI(currentChannel: number, event: WamMidiData): boolean {
        let value = this.messager.ingestMIDI(currentChannel, this.value, event)

        if (value === undefined) {
            return false
        }
        if (value === this.value) {
            return false
        }

        const option = this.options.find(o => o.value == value)
        if (option === undefined) {
            return false
        }

        this.value = value
        this.automationDirty = true

        return true
    }

    updateFromSysex(value: number) {
        this.value = value
        this.automationDirty = true
    }

    parameterUpdate(newValue: number): boolean {
        const option = this.options.find(o => o.value == newValue)
        if (option === undefined) {
            return false
        }

        const dirty = this.value != newValue

        if (dirty) {
            this.midiDirty = true
        }

        this.value = newValue

        return dirty
    }

    midiMessage(channel: number, force: boolean = false): WamMidiEvent[] | undefined {
        if (!this.midiDirty && !force) {
            return undefined
        }

        this.midiDirty = false
        return this.messager.toMIDI(channel, this.value)
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
