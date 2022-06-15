import { WamParameterConfiguration } from "@webaudiomodules/api"
import { string } from "lib0"
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

export class InstrumentKernel {
    definition: InstrumentDefinition
    values: Map<string, number>
    controls: MIDIControl[]

    constructor(definition: InstrumentDefinition, previous?: InstrumentKernel) {
        this.definition = definition
    }

    toWAM() {
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
    }
}