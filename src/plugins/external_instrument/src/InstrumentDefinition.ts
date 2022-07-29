import { AudioWorkletGlobalScope, WamAutomationEvent, WamEvent, WamMidiData, WamParameterConfiguration } from "@webaudiomodules/api"
import {NoteDefinition} from "wam-extensions"
import { DynamicParamGroup } from "../../shared/DynamicParameterNode"

export type CCParamData = {
    dataType: "CC"
    ccNumber: number
    defaultValue?: number
    minValue?: number
    maxValue?: number
}

export type SysexParamData = {
    dataType: "SYSEX"
    prefix: number[]
    defaultValue?: number
    minValue?: number
    maxValue?: number
}

export type NRPNParamData = {
    dataType: "NRPN"
    lsb: number
    msb: number
    defaultValue?: number
    minValue?: number
    maxValue?: number
}

export type RPNParamData = {
    dataType: "RPN"
    lsb: number
    msb: number
    defaultValue?: number
    minValue?: number
    maxValue?: number
}

export type MIDIControlType = "CC" | "SYSEX" | "NRPN" | "RPN"
export type MIDIControlData = CCParamData | SysexParamData | NRPNParamData | RPNParamData

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
    existingControl(compare: MIDIControlData): MIDIControl | undefined
    defaultIdForControl(control: MIDIControlData): string
}

export type RPNState = {
    lsb?: number
    msb?: number
    value?: number
}

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

const getInstrumentKernel = (moduleId: string) => {
    const MIDI_CC = 0xB0
    
    class InstrumentKernel implements InstrumentKernelType {
        definition: InstrumentDefinition
        values: Record<string, number>
        controls: MIDIControl[]
        channel: number
        nrpn: RPNState
        rpn: RPNState
        lastRPN: undefined | "RPN" | "NRPN"

        constructor(definition: InstrumentDefinition, channel: number, previous?: InstrumentKernel) {
            if (channel > 15 || channel < 0) {
                throw "Channel must be 0-indexed MIDI channel, a number between 0 and 15"
            }

            this.definition = definition
            this.controls = []
            this.channel = channel
            this.values = {}
            this.rpn = {}
            this.nrpn = {}

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

        existingControl(compare: MIDIControlData): MIDIControl | undefined {
            return this.controls.find(c => this.sameControl(compare, c.data))
        }

        sameControl(lhs: MIDIControlData, rhs: MIDIControlData): boolean {
            if (lhs.dataType != rhs.dataType) {
                return false
            }

            switch (lhs.dataType) {
                case "CC":
                    return lhs.ccNumber == (rhs as CCParamData).ccNumber
                case "NRPN":
                case "RPN":
                    let r = rhs as RPNParamData
                    return lhs.lsb == r.lsb && lhs.msb == r.msb
                case "SYSEX":
                    return lhs.prefix == (rhs as SysexParamData).prefix
            }
        }

        ingestMidi(event: WamMidiData): ["wam" | "port", Record<string, any>] | undefined {
            if (event.bytes[0] == 0xB0 + this.channel) {
                const cc = event.bytes[1]
                if (RPNCCs.includes(cc)) {
                    return this.ingestRPN(event)
                } else {
                    let existing = this.existingControl({dataType:"CC", ccNumber: cc})
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
                        let data: CCParamData = {
                            dataType: "CC",
                            ccNumber: cc,
                            defaultValue: event.bytes[2],
                            minValue: 0,
                            maxValue: 127
                        }

                        let learnEvent = {
                            source: "kernel",
                            type: "learn",
                            data: data
                        }
                        return ["port", learnEvent]
                    }
                }
            } else {
                return undefined
            }
        }

        ingestRPN(event: WamMidiData): ["wam" | "port", Record<string, any>] | undefined {
            const cc = event.bytes[1]

            if (!!this.lastRPN && [6, 38, 96, 97].includes(cc)) {
                let existing: MIDIControl | undefined
                let incoming: MIDIControlData

                console.log("HERE")
                if (this.lastRPN == "NRPN" && this.nrpn.lsb !== undefined && this.nrpn.msb !== undefined) {
                    incoming = {dataType: "NRPN", lsb: this.nrpn.lsb, msb: this.nrpn.msb}
                    existing = this.existingControl(incoming)
                } else if (this.lastRPN == "RPN" && this.rpn.lsb !== undefined && this.rpn.msb !== undefined) {
                    incoming = {dataType: "RPN", lsb: this.nrpn.lsb, msb: this.nrpn.msb}
                    existing = this.existingControl(incoming)
                }

                if (existing) {
                    if (cc == 6) {
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
                        console.warn("Received CC for NRPN LSB, not implemented yet")
                    }
                } else {
                    if (cc == 6) {
                        incoming.defaultValue = event.bytes[2]

                        let learnEvent = {
                            source: "kernel",
                            type: "learn",
                            data: incoming
                        }
                        return ["port", learnEvent]
                    } else {
                        console.warn("Received NRPN LSB set, not implemented yet")
                    }
                }
            } else if ([98, 99].includes(cc)) {
                // NRPN address
                this.lastRPN = "NRPN"
                if (cc == 98) {
                    this.nrpn.lsb = event.bytes[2]
                } else {
                    this.nrpn.msb = event.bytes[2]
                }
            } else if ([100, 101].includes(cc)) {
                // RPN address
                this.lastRPN = "RPN"
                if (cc == 100) {
                    this.nrpn.lsb = event.bytes[2]
                } else {
                    this.nrpn.msb = event.bytes[2]
                }
            }
            return undefined
        }

        defaultIdForControl(control: MIDIControlData): string {
            switch(control.dataType) {
                case "CC":
                    return `CC${control.ccNumber}`
                case "NRPN":
                    return `NRPN${control.msb}:${control.lsb}`
                case "RPN":
                    return `RPN${control.msb}:${control.lsb}`
                case "SYSEX":
                    return `SYS${control.prefix}`
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