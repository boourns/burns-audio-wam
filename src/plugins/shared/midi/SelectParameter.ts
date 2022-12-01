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
    // SelectParameter.value holds the current index into the options array as it's value, which maps to the WAM parameter value but needs translation to become the MIDI value
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
            label: this.label,
            type: "choice",
            defaultValue: this.defaultValue,
            minValue: 0,
            maxValue: this.options.length - 1,
            choices: this.options.map(o => o.label)
        }
    }

    ingestMIDI(currentChannel: number, event: WamMidiData): boolean {
        let currentMidiValue = this.options[this.value].value
        let newMidiValue = this.messager.ingestMIDI(currentChannel, currentMidiValue, event)

        if (newMidiValue === undefined) {
            return false
        }

        if (newMidiValue === currentMidiValue) {
            return false
        }

        const index = this.options.findIndex(o => o.value == newMidiValue)

        if (index < 0) {
            return false
        }

        this.value = index
        this.automationDirty = true

        return true
    }

    updateFromSysex(value: number) {
        this.value = value
        this.automationDirty = true
    }

    parameterUpdate(newValue: number): boolean {
        const option = this.options[newValue]

        if (option === undefined) {
            console.log("Could not find option for newvalue ", newValue, this.id, this.options)
            return false
        }

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

        const option = this.options[this.value]
        if (!option) {
            console.error(`select ${this.id}: value ${this.value} should reference a select option index ${this.options}`)
            return []
        }

        return this.messager.toMIDI(channel, option.value)
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
