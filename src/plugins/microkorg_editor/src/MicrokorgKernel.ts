// what's the right interface here?

import { WamMidiData, WamMidiEvent, WamParameterConfiguration, WamParameterDataMap, WamParameterInfoMap } from "@webaudiomodules/api";
import { DynamicParamGroup } from "../../shared/DynamicParameterNode";
import { SimpleCCParameter } from "./SimpleCCParameter";

export class MicrokorgKernel {
    channel: number
    parameters: Record<string, SimpleCCParameter>
    midiDirty: boolean
    paramDirty: boolean

    constructor() {
        this.channel = -1
        this.parameters = {}

        this.parameters.cutoff = new SimpleCCParameter("Filter Cutoff", 11, 64, 0, 127)
    }

    wamParameters(): Record<string, WamParameterConfiguration> {
        let result:  Record<string, WamParameterConfiguration> = {}
        for (let id of Object.keys(this.parameters)) {
            result[id] = this.parameters[id].toWAM()
        }

        return result
    }

    ingestMIDI(event: WamMidiData): boolean {
        for (let id of Object.keys(this.parameters)) {
            if (this.parameters[id].ingestMIDI(this.channel, event)) {
                // found a parameter that ingested this MIDI event, return
                return true
            }
        }
        return false
    }

    ingestSysex(event: any) {
        // TODO custom sysex interpretation for Microkorg
    }

    parameterUpdate(params: WamParameterDataMap) {

    }

    portMessages() {

    }
}