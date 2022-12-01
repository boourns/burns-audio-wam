import { MIDIControllerKernel } from "../../shared/midi/MIDIControllerKernel"
import { SynthParameter } from "../../shared/midi/IntParameter";
import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration } from "@webaudiomodules/api";


export class ExternalInstrumentKernel implements MIDIControllerKernel {
    parameters: Record<string, SynthParameter>

    // todo pass in serialized configuration
    constructor() {
        this.parameters = {}
    }

    midiMessages(channel: number, force: boolean = false): WamMidiEvent[] {
        let results: WamMidiEvent[] = []

        for (let id of Object.keys(this.parameters)) {
            results.push(...this.parameters[id].midiMessage(channel, force))
        }

        return results
    }

    wamParameters(): Record<string, WamParameterConfiguration> {
        let result: Record<string, WamParameterConfiguration> = {}
        for (let id of Object.keys(this.parameters)) {
            result[id] = this.parameters[id].toWAM()
            if (id != this.parameters[id].id) {
                throw new Error(`Parameter ${id}: key does not match parameter id ${this.parameters[id].id}`)
            }
        }

        return result
    }
    
    parameterUpdate(values: Record<string, number>): boolean {
        let result: boolean = false

        const params = this.parameters

        for (let id of Object.keys(values)) {
            if (params[id].parameterUpdate(values[id])) {
                result = true
            }
        }

        return result
    }

    ingestMIDI(channel: number, event: WamMidiData): boolean {
        let result = false

        for (let id of Object.keys(this.parameters)) {
            if (this.parameters[id].ingestMIDI(channel, event)) {
                result = true
            }
        }

        return result
    }

    toSysex(channel: number): Uint8Array {
        throw "toSysex not supported"
    }

    sysexNeeded() {
        return false
    }

    automationMessages(force: boolean): WamAutomationEvent[] {
        const params = this.parameters
        return Object.keys(params).map(id => params[id].automationMessage(force)).filter(ev => ev !== undefined)
    }

    fromSysex(channel: number, sysex: Uint8Array): boolean {
        throw "fromSysex not supported!"
    }
}