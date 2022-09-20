import { AudioWorkletGlobalScope, WamAutomationEvent, WamEvent, WamMidiData, WamParameterConfiguration } from "@webaudiomodules/api"
import {NoteDefinition} from "wam-extensions"
import { DynamicParamGroup } from "../../shared/DynamicParameterNode"

export type CCParamData = {
    dataType: "CC"
    ccNumber: number
    defaultValue: number
    minValue: number
    maxValue: number
}

export type SysexParamData = {
    dataType: "SYSEX"
    prefix: number[]
    defaultValue: number
    minValue: number
    maxValue: number
}

export type MIDIControlType = "CC" | "SYSEX" // | "NRPN"
export type MIDIControlData = CCParamData | SysexParamData

export type MIDIControl = {
    label: string
    id: string
    data: MIDIControlData
}

export type MIDIControlGroup = {
    label: string
    controls: MIDIControl[]
}

export type InstrumentDefinition = {
    notesNames?: NoteDefinition[]
    controlGroups: MIDIControlGroup[]
}

export type InstrumentKernelType = {
    definition: InstrumentDefinition
    values: Record<string, number>
    controls: MIDIControl[]
    channel: number
    toWAM(): DynamicParamGroup[]
    generateMidiEvent(control: MIDIControl, value: number): WamEvent[]
    emitEvents(parameters: Record<string, number>): WamEvent[]
    ingestMidi(event: WamMidiData): ["wam" | "port", Record<string, any>] | undefined;
    existingControlForCC(num: number): MIDIControl | undefined
}

const getInstrumentKernel = (moduleId: string) => {

    const MIDI_CC = 0xB0
    
    class InstrumentKernel implements InstrumentKernelType {
        definition: InstrumentDefinition
        values: Record<string, number>
        controls: MIDIControl[]
        channel: number

        constructor(definition: InstrumentDefinition, channel: number, previous?: InstrumentKernel) {
            if (channel > 15 || channel < 0) {
                throw "Channel must be 0-indexed MIDI channel, a number between 0 and 15"
            }

            this.definition = definition
            this.controls = []
            this.channel = channel
            this.values = {}

            for (let group of definition.controlGroups) {
                for (let control of group.controls) {
                    this.controls.push(control)

                    if (previous && previous.values[control.id] !== undefined) {
                        this.values[control.id] = previous.values[control.id]
                    }
                }
            }
        }

        toWAM(): DynamicParamGroup[] {
            let groups: DynamicParamGroup[] = []

            for (let defGroup of this.definition.controlGroups) {
                let group: DynamicParamGroup = {
                    name: defGroup.label,
                    params: []
                }
                for (let control of defGroup.controls) {
                    let param: WamParameterConfiguration = {}

                    switch(control.data.dataType) {
                        case "CC":
                            let data = control.data as MIDIControlData
                            param.defaultValue = data.defaultValue
                            param.minValue = data.minValue
                            param.maxValue = data.maxValue
                            param.type = "int"
                        break
                        default:
                            throw "Could not convert control " + JSON.stringify(control)
                    }

                    group.params.push({
                        id: control.id,
                        config: param
                    })
                }

                groups.push(group)
            }
            return groups
        }

        generateMidiEvent(control: MIDIControl, value: number): WamEvent[] {
            switch(control.data.dataType) {
                case "CC":
                    return [
                        {
                            type: "wam-midi", 
                            data: {
                                bytes: [MIDI_CC + this.channel, control.data.ccNumber, value]
                            }
                        }
                    ]
            }
            return []
        }

        emitEvents(parameters: Record<string, number>): WamEvent[] {
            let output: WamEvent[] = []

            for (const control of this.controls) {
                const newValue = parameters[control.id]
                const oldValue = this.values[control.id]

                if (oldValue != newValue) {
                    this.values[control.id] = newValue
                    output.push(...this.generateMidiEvent(control, newValue))
                }
            }

            return output
        }

        existingControlForCC(num: number): MIDIControl | undefined {
            return this.controls.find(c => c.data.dataType == "CC" && c.data.ccNumber == num)
        }

        ingestMidi(event: WamMidiData): ["wam" | "port", Record<string, any>] | undefined {
            if (event.bytes[0] == 0xB0 + this.channel) {
                let existing = this.existingControlForCC(event.bytes[1])
                if (existing) {
                    let automation: WamAutomationEvent = {
                        type: "wam-automation",
                        data: {
                            id: existing.id,
                            value: event.bytes[2],
                            normalized: false,
                        }
                    }
                    return ["wam", automation]

                } else {
                    let learnEvent = {
                        source: "kernel",
                        type: "learn",
                        data: {
                            cc: event.bytes[1],
                            value: event.bytes[2]
                        }
                    }
                    return ["port", learnEvent]


                }
            } else {
                return undefined
            }
        }
    }

    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

    if (audioWorkletGlobalScope.webAudioModules) {
        const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);

        ModuleScope.InstrumentKernel = InstrumentKernel
    }

    return InstrumentKernel
}

export default getInstrumentKernel