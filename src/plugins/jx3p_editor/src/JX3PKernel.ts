import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration, WamParameterDataMap, WamParameterInfoMap, WamSysexEvent } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

import { SelectOption, SelectParameter } from "../../shared/midi/SelectParameter";
import { IntParameter, SynthParameter } from "../../shared/midi/IntParameter";
import { ControlChangeMessager } from "../../shared/midi/ControlChangeMessager";
import { MIDIControllerKernel } from "../../shared/midi/MIDIControllerKernel";

export class JX3PKernel implements MIDIControllerKernel {
    parameters: Record<string, SynthParameter>

    midiDirty: boolean
    paramDirty: boolean
    selectedTimbre: number | undefined

    constructor() {
        this.parameters = {}

        this.parameters["env_attack"] = new IntParameter("env_attack", "Env Attack", new ControlChangeMessager(26), 0, 0, 127)
        this.parameters["env_decay"] = new IntParameter("env_decay", "Env Decay", new ControlChangeMessager(27), 0, 0, 127)
        this.parameters["env_sustain"] = new IntParameter("env_sustain", "Env Sustain", new ControlChangeMessager(28), 0, 0, 127)
        this.parameters["env_release"] = new IntParameter("env_release", "Env Release", new ControlChangeMessager(29), 0, 0, 127)

        // DCO 1
        const range: SelectOption[] = [
            {value: 0, label: "16'"},
            {value: 32, label: "8'"},
            {value: 64, label: "4'"},
        ]
        const wave1: SelectOption[] = [
            {value: 0, label: "Ramp"},
            {value: 32, label: "Pulse"},
            {value: 64, label: "Square"}
        ]
        const wave2 = [...wave1, {value: 96, label: "Noise"}]

        this.parameters["dco1_octave"] = new SelectParameter("dco1_octave", "DCO1 Octave", new ControlChangeMessager(72), 0, range)
        this.parameters["dco1_wave"] = new SelectParameter("dco1_wave", "DCO1 Wave", new ControlChangeMessager(73), 0, wave1)
        
        const off_on: SelectOption[] = [
            { value: 0, label: "Off" },
            { value: 64, label: "On" }
        ]

        this.parameters["dco1_lfo"] = new SelectParameter("dco1_lfo", "LFO->DCO1", new ControlChangeMessager(82), 0, off_on)
        this.parameters["dco1_env"] = new SelectParameter("dco1_env", "Env->DCO1", new ControlChangeMessager(81), 0, off_on)

        // DCO 2

        this.parameters["dco2_octave"] = new SelectParameter("dco2_octave", "DCO2 Octave", new ControlChangeMessager(74), 0, range)
        this.parameters["dco2_wave"] = new SelectParameter("dco2_wave", "DCO1 Wave", new ControlChangeMessager(75), 0, wave2)
        
        const cross_mod = [
            { value: 0, label: "Off"},
            { value: 32, label: "Sync"},
            { value: 64, label: "Metal"}
        ]

        const polarity: SelectOption[] = [
            { value: 0, label: "Neg" },
            { value: 64, label: "Pos" }
        ]

        this.parameters["dco2_mod"] = new SelectParameter("dco2_mod", "DCO2 Crossmod", new ControlChangeMessager(76), 0, cross_mod)
        this.parameters["dco2_tune"] = new IntParameter("dco2_tune", "DCO2 Coarse Tune", new ControlChangeMessager(13), 0, 0, 127)
        this.parameters["dco2_fine"] = new IntParameter("dco2_fine", "DCO2 Fine Tune", new ControlChangeMessager(12), 0, 0, 127)

        this.parameters["dco2_lfo"] = new SelectParameter("dco2_lfo", "LFO->DCO2", new ControlChangeMessager(80), 0, off_on)
        this.parameters["dco2_env"] = new SelectParameter("dco2_env", "Env->DCO2", new ControlChangeMessager(79), 0, off_on)

        this.parameters["osc_lfo"] = new IntParameter("osc_lfo", "Osc LFO Mod", new ControlChangeMessager(15), 0, 0, 127)
        
        this.parameters["osc_env"] = new IntParameter("osc_env", "Osc Env Mod", new ControlChangeMessager(14), 0, 0, 127)
        this.parameters["osc_env_polarity"] = new SelectParameter("osc_env_polarity", "Osc Env Polarity", new ControlChangeMessager(77), 0, polarity)

        // Mixer
        this.parameters["mix"] = new IntParameter("mix", "Source Mix", new ControlChangeMessager(16), 0, 0, 127)
        this.parameters["hpf"] = new IntParameter("hpf", "High-pass Filter", new ControlChangeMessager(17), 0, 0, 127)
        
        // filter
        this.parameters["cutoff"] = new IntParameter("cutoff", "Filter Cutoff", new ControlChangeMessager(19), 0, 0, 127)
        this.parameters["res"] = new IntParameter("res", "Filter Res", new ControlChangeMessager(18), 0, 0, 127)

        this.parameters["filter_lfo"] = new IntParameter("filter_lfo", "Filter Envelope", new ControlChangeMessager(20), 0, 0, 127)
        this.parameters["filter_env"] = new IntParameter("filter_env", "Filter LFO", new ControlChangeMessager(21), 0, 0, 127)
        this.parameters["filter_env_polarity"] = new SelectParameter("filter_env_polarity", "Filter Env Polarity", new ControlChangeMessager(77), 0, polarity)

        this.parameters["filter_pitch"] = new IntParameter("filter_pitch", "Filter Pitch Follow", new ControlChangeMessager(22), 0, 0, 127)

        this.parameters["level"] = new IntParameter("level", "Patch level", new ControlChangeMessager(23), 0, 0, 127)
        this.parameters["chorus"] = new SelectParameter("chorus", "Chorus", new ControlChangeMessager(85), 0, off_on)

        const gate = [
            {value: 0, label: "gate"},
            {value: 64, label: "env"}
        ]

        this.parameters["gate"] = new SelectParameter("gate", "Gate mode", new ControlChangeMessager(78), 0, gate)

        const lfo_waves = [
            {value: 0, label: "Sine"},
            {value: 32, label: "Square"},
            {value: 64, label: "Random"}
        ]
        this.parameters["lfo_wave"] = new SelectParameter("lfo_wave", "LFO Wave", new ControlChangeMessager(99), 0, off_on)
        this.parameters["lfo_delay"] = new IntParameter("lfo_delay", "LFO Delay", new ControlChangeMessager(25), 0, 0, 127)
        this.parameters["lfo_rate"] = new IntParameter("lfo_rate", "LFO Rate", new ControlChangeMessager(24), 0, 0, 127)
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

    ingestMIDI(channel: number, event: WamMidiData): boolean {
        let result = false

        for (let id of Object.keys(this.parameters)) {
            if (this.parameters[id].ingestMIDI(channel, event)) {
                result = true
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

    automationMessages(force: boolean): WamAutomationEvent[] {
        const params = this.parameters
        return Object.keys(params).map(id => params[id].automationMessage(force)).filter(ev => ev !== undefined)
    }

    sysexNeeded() {
        return false
    }

    toSysex(channel: number): Uint8Array {
        throw new Error("sysex not supported")
    }

    fromSysex(channel: number, sysex: Uint8Array): boolean {
        return false
    }

    midiMessages(channel: number, force: boolean = false): WamMidiEvent[] {
        let results: WamMidiEvent[] = []

        for (let id of Object.keys(this.parameters)) {
            results.push(...this.parameters[id].midiMessage(channel, force))
        }

        return results
    }
}