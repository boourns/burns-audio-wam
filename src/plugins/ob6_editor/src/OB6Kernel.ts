import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration, WamParameterDataMap, WamParameterInfoMap, WamSysexEvent } from "@webaudiomodules/api";

import { SelectOption, SelectParameter } from "../../shared/midi/SelectParameter";
import { IntParameter, SynthParameter } from "../../shared/midi/IntParameter";
import { ControlChangeMessager } from "../../shared/midi/ControlChangeMessager";
import { MIDIControllerKernel } from "../../shared/midi/MIDIControllerKernel";
import { NRPNMessager } from "../../shared/midi/NRPNMessager";

const nrpnmsb = (num: number) => {
    return nrpn(num)
}

const nrpn = (num: number) => {
    return new NRPNMessager(false, num % 128, Math.floor(num / 128))
}

export class OB6Kernel implements MIDIControllerKernel {
    parameters: Record<string, SynthParameter>

    midiDirty: boolean
    paramDirty: boolean
    selectedTimbre: number | undefined

    constructor() {
        const off_on: SelectOption[] = [
            { value: 0, label: "Off" },
            { value: 64, label: "On" }
        ]

        const off_on_1: SelectOption[] = [
            { value: 0, label: "Off" },
            { value: 1, label: "On" }
        ]

        this.parameters = {}

        this.parameters["portamento_time"] = new IntParameter("portamento_time", "Portamento Time", new ControlChangeMessager(5), 0, 0, 127)
        this.parameters["portamento"] = new SelectParameter("portamento", "Portamento", new ControlChangeMessager(65), 0, off_on)
        this.parameters["brightness"] = new IntParameter("brightness", "Brightness", new ControlChangeMessager(74), 0, 0, 127)

        this.parameters["env_amount"] = new IntParameter("env_amount", "Env Amount", new ControlChangeMessager(40), 100, 0, 127)
        this.parameters["env_velocity"] = new IntParameter("env_velocity", "Env Velocity Amt", new ControlChangeMessager(41), 64, 0, 127)
        this.parameters["env_attack"] = new IntParameter("env_attack", "Env Attack", new ControlChangeMessager(43), 0, 0, 127)
        this.parameters["env_decay"] = new IntParameter("env_decay", "Env Decay", new ControlChangeMessager(44), 40, 0, 127)
        this.parameters["env_sustain"] = new IntParameter("env_sustain", "Env Sustain", new ControlChangeMessager(45), 100, 0, 127)
        this.parameters["env_release"] = new IntParameter("env_release", "Env Release", new ControlChangeMessager(46), 20, 0, 127)

        this.parameters["fenv_amount"] = new IntParameter("fenv_amount", "F. Env Amount", new ControlChangeMessager(47), 70, 0, 127)
        this.parameters["fenv_attack"] = new IntParameter("fenv_attack", "F. Env Attack", new ControlChangeMessager(50), 0, 0, 127)
        this.parameters["fenv_decay"] = new IntParameter("fenv_decay", "F. Env Decay", new ControlChangeMessager(51), 30, 0, 127)
        this.parameters["fenv_sustain"] = new IntParameter("fenv_sustain", "F. Env Sustain", new ControlChangeMessager(52), 100, 0, 127)
        this.parameters["fenv_release"] = new IntParameter("fenv_release", "F. Env Release", new ControlChangeMessager(53), 40, 0, 127)

        this.parameters["filter_freq"] = new IntParameter("filter_freq", "Filter Freq", new ControlChangeMessager(102), 108, 0, 127)
        this.parameters["filter_res"] = new IntParameter("filter_res", "Filter Res", new ControlChangeMessager(103), 0, 0, 127)

        const filter_key: SelectOption[] = [
            {label: "Off", value: 0},
            {label: "Half", value: 1},
            {label: "Full", value: 2}

        ]
        this.parameters["filter_key"] = new SelectParameter("filter_key", "Filter Key Amt", new ControlChangeMessager(104), 1, filter_key)
        this.parameters["filter_vel"] = new SelectParameter("filter_vel", "Vel -> Filter", new ControlChangeMessager(105), 1, off_on)
        this.parameters["filter_mode"] = new IntParameter("filter_mode", "Filter Mode", new ControlChangeMessager(106), 0, 0, 127)
        this.parameters["filter_bp"] = new SelectParameter("filter_bp", "Filter BP", new ControlChangeMessager(107), 0, off_on)

        this.parameters["osc1_freq"] = new IntParameter("osc1_freq", "Osc1 Freq", new ControlChangeMessager(67), 32, 0, 127)
        this.parameters["osc1_shape"] = new IntParameter("osc1_shape", "Osc1 Shape", new ControlChangeMessager(70), 0, 0, 127)
        this.parameters["osc1_pw"] = new IntParameter("osc1_pw", "Osc1 Pulse Width", new ControlChangeMessager(71), 64, 0, 127)
        this.parameters["osc1_sync"] = new SelectParameter("osc1_sync", "Osc1 Sync", new NRPNMessager(false, 1, 0), 0, off_on_1)
        
        this.parameters["osc2_freq"] = new IntParameter("osc2_freq", "Osc2 Freq", new ControlChangeMessager(75), 32, 0, 127)
        this.parameters["osc2_shape"] = new IntParameter("osc2_shape", "Osc2 Shape", new ControlChangeMessager(78), 0, 0, 127)
        this.parameters["osc2_pw"] = new IntParameter("osc2_pw", "Osc2 Pulse Width", new ControlChangeMessager(79), 0, 0, 127)
        this.parameters["osc2_detune"] = new IntParameter("osc2_detune", "Osc2 Detune", new NRPNMessager(false, 6, 0), 127, 0, 254)
        this.parameters["osc2_lo_freq"] = new SelectParameter("osc2_lo_freq", "Osc2 Lo Freq", new NRPNMessager(false, 10, 0), 0, off_on_1)
        this.parameters["osc2_key_track"] = new SelectParameter("osc2_key_track", "Osc2 Key Track", new NRPNMessager(false, 11, 0), 1, off_on_1)

        this.parameters["mixer_osc1"] = new IntParameter("mixer_osc1", "Osc1 Level", new ControlChangeMessager(69), 100, 0, 127)
        this.parameters["mixer_osc2"] = new IntParameter("mixer_osc2", "Osc2 Level", new ControlChangeMessager(77), 0, 0, 127)
        this.parameters["mixer_sub"] = new IntParameter("mixer_sub", "Sub Level", new ControlChangeMessager(8), 0, 0, 127)
        this.parameters["mixer_noise"] = new IntParameter("mixer_noise", "Noise Level", new NRPNMessager(false, 32, 0), 0, 0, 127)

        this.parameters["distortion"] = new IntParameter("distortion", "Distortion", new ControlChangeMessager(9), 0, 0, 127)

        this.parameters["volume"] = new IntParameter("volume", "Volume", new ControlChangeMessager(7), 100, 0, 127)
        this.parameters["pan_spread"] = new IntParameter("pan_spread", "Pan Spread", new NRPNMessager(false, 63, 0), 0, 0, 127)
        this.parameters["unison"] = new SelectParameter("unison", "Unison", nrpnmsb(150), 0, off_on_1)
        this.parameters["pb_range"] = new IntParameter("pb_range", "Bend Range", new NRPNMessager(false, 31, 0), 0, 0, 12)

        this.parameters["lfo_freq"] = new IntParameter("lfo_freq", "LFO Freq", new NRPNMessager(false, 88, 0), 40, 0, 254)
        this.parameters["lfo_amount"] = new IntParameter("lfo_amount", "LFO Initial Amount", new NRPNMessager(false, 89, 0), 0, 0, 254)

        const lfo_shape: SelectOption[] = [
            { value: 0, label: "Sin" },
            { value: 1, label: "Saw" },
            { value: 2, label: "Rev Saw" },
            { value: 3, label: "Square" },
            { value: 4, label: "Random" }
        ]
        this.parameters["lfo_shape"] = new SelectParameter("lfo_shape", "LFO Shape", new NRPNMessager(false, 90, 0), 0, lfo_shape)
        this.parameters["lfo_sync"] = new SelectParameter("lfo_sync", "LFO Sync", new NRPNMessager(false, 91, 0), 0, off_on_1)
        this.parameters["lfo_freq1"] = new SelectParameter("lfo_freq1", "LFO -> Freq1", new NRPNMessager(false, 93, 0), 0, off_on_1)
        this.parameters["lfo_freq2"] = new SelectParameter("lfo_freq2", "LFO -> Freq2", new NRPNMessager(false, 94, 0), 0, off_on_1)
        const lfo_pw = [
            { value: 0, label: "Off"},
            { value: 1, label: "Osc1"},
            { value: 2, label: "Osc2"},
            { value: 3, label: "Osc 1/2"}
        ]
        this.parameters["lfo_pw"] = new SelectParameter("lfo_pw", "LFO -> PW 1/2", new NRPNMessager(false, 95, 0), 0, lfo_pw)

        this.parameters["lfo_amp"] = new SelectParameter("lfo_amp", "LFO -> Amp", new NRPNMessager(false, 96, 0), 0, off_on_1)
        this.parameters["lfo_mode"] = new SelectParameter("lfo_mode", "LFO -> Filter Mode", new NRPNMessager(false, 97, 0), 0, off_on_1)
        this.parameters["lfo_filter"] = new SelectParameter("lfo_filter", "LFO -> Filter", new NRPNMessager(false, 98, 0), 1, off_on_1)

        this.parameters["pressure_amt"] = new IntParameter("pressure_amt", "Pressure Amt", new NRPNMessager(false, 109, 0), 150, 0, 254)
        this.parameters["pressure_freq1"] = new SelectParameter("pressure_freq1", "Pressure -> Freq1", new NRPNMessager(false, 110, 0), 0, off_on_1)
        this.parameters["pressure_freq2"] = new SelectParameter("pressure_freq2", "Pressure -> Freq2", new NRPNMessager(false, 111, 0), 0, off_on_1)
        this.parameters["pressure_filter"] = new SelectParameter("pressure_filter", "Pressure -> Filter", new NRPNMessager(false, 112, 0), 0, off_on_1)
        this.parameters["pressure_mode"] = new SelectParameter("pressure_mode", "Pressure -> F. Mode", new NRPNMessager(false, 113, 0), 0, off_on_1)
        this.parameters["pressure_vca"] = new SelectParameter("pressure_vca", "Pressure -> VCA", new NRPNMessager(false, 114, 0), 0, off_on_1)
        this.parameters["pressure_lfo"] = new SelectParameter("pressure_lfo", "Pressure -> LFO", new NRPNMessager(false, 115, 0), 1, off_on_1)

        const fx1_type: SelectOption[] = [
                { value: 0, label: "Off"},
                { value: 1, label: "BBD"},
                { value: 2, label: "DDL"},
                { value: 3, label: "Chorus"},
                { value: 4, label: "PH1"},
                { value: 5, label: "PH2"},
                { value: 6, label: "PH3"},
                { value: 7, label: "Ring Mod"},
                { value: 8, label: "FL1"},
                { value: 9, label: "FL2"}
        ]

        const fx2_type: SelectOption[] = [
            ...fx1_type,
            { value: 10, label: "Hall"},
            { value: 11, label: "Room"},
            { value: 12, label: "Plate"},
            { value: 13, label: "Spring"},
        ]

        this.parameters["fx1_type"] = new SelectParameter("fx1_type", "FX1 Type", new NRPNMessager(false, 119, 0), 1, fx1_type)
        this.parameters["fx1_mix"] = new IntParameter("fx1_mix", "FX1 Mix", new NRPNMessager(false, 120, 0), 40, 0, 127)
        this.parameters["fx1_param1"] = new IntParameter("fx1_param1", "FX1 Param 1", new NRPNMessager(false, 121, 0), 40, 0, 255)
        this.parameters["fx1_param2"] = new IntParameter("fx1_param2", "FX1 Param 2", new NRPNMessager(false, 122, 0), 40, 0, 127)
        this.parameters["fx1_sync"] = new SelectParameter("fx1_sync", "FX1 Sync", new NRPNMessager(false, 123, 0), 0, off_on_1)

        this.parameters["fx2_type"] = new SelectParameter("fx2_type", "FX2 Type", new NRPNMessager(false, 127, 0), 10, fx2_type)
        this.parameters["fx2_mix"] = new IntParameter("fx2_mix", "FX2 Mix", nrpnmsb(128), 30, 0, 127)
        this.parameters["fx2_param1"] = new IntParameter("fx2_param1", "FX2 Param 1", nrpn(129), 30, 0, 255)
        this.parameters["fx2_param2"] = new IntParameter("fx2_param2", "FX2 Param 2", nrpnmsb(130), 30, 0, 127)
        this.parameters["fx2_sync"] = new SelectParameter("fx2_sync", "FX2 Sync", nrpnmsb(131), 0, off_on_1)
        this.parameters["fx_enable"] = new SelectParameter("fx_enable", "FX Enable", nrpnmsb(135), 0, off_on_1)

        this.parameters["xmod_filter_env"] = new IntParameter("xmod_filter_env", "XMod Filter Env", nrpn(143), 0, 0, 254)
        this.parameters["xmod_osc2"] = new IntParameter("xmod_osc2", "XMod Osc 2", nrpn(133), 0, 0, 254)
        
        this.parameters["xmod_freq1"] = new SelectParameter("xmod_freq1", "XMod -> Freq1", nrpnmsb(145), 0, off_on_1)
        this.parameters["xmod_shape1"] = new SelectParameter("xmod_shape1", "XMod -> Shape1", nrpnmsb(146), 1, off_on_1)
        this.parameters["xmod_pw1"] = new SelectParameter("xmod_pw1", "XMod -> PW 1", nrpnmsb(147), 0, off_on_1)
        this.parameters["xmod_filter"] = new SelectParameter("xmod_filter", "XMod -> Filter", nrpnmsb(148), 0, off_on_1)
        this.parameters["xmod_mode"] = new SelectParameter("xmod_mode", "XMod -> Filter Mode", nrpnmsb(149), 0, off_on_1)
        this.parameters["xmod_bp"] = new SelectParameter("xmod_bp", "XMod -> Filter BP", nrpnmsb(150), 0, off_on_1)

        const unison_mode = [
            { value: 0, label: "1"},
            { value: 1, label: "2"},
            { value: 2, label: "3"},
            { value: 3, label: "4"},
            { value: 4, label: "5"},
            { value: 5, label: "6"},
            { value: 6, label: "Chrd"},
        ]
        this.parameters["unison_mode"] = new SelectParameter("unison_mode", "Unison Mode", nrpnmsb(157), 0, unison_mode)
        
        const key_mode = [
            { value: 0, label: "1"},
            { value: 1, label: "2"},
            { value: 2, label: "3"},
            { value: 3, label: "4"},
            { value: 4, label: "5"},
            { value: 5, label: "6"},
        ]
        this.parameters["key_mode"] = new SelectParameter("key_mode", "Key Mode", nrpnmsb(158), 0, key_mode)

        // TODO detect values
        this.parameters["arp"] = new SelectParameter("arp", "Arpeggiator", new ControlChangeMessager(58), 0, off_on)
        const arp_mode = [
            { value: 0, label: "Up"},
            { value: 1, label: "Down"},
            { value: 2, label: "Up/Down"},
            { value: 3, label: "Random"},
            { value: 4, label: "Assign"}
        ]
        this.parameters["arp_mode"] = new SelectParameter("arp_mode", "Arp Mode", new ControlChangeMessager(59), 0, arp_mode)

        const arp_octave = [
            { value: 0, label: "1"},
            { value: 1, label: "2"},
            { value: 2, label: "3"}
        ]
        this.parameters["arp_octave"] = new SelectParameter("arp_octave", "Arp Octave", new ControlChangeMessager(60), 1, arp_octave)
        
        const arp_time: SelectOption[] = [
            { value: 0, label: "Half"},
            { value: 1, label: "Quarter"},
            { value: 2, label: "Dotted 8th"},
            { value: 3, label: "8th"},
            { value: 4, label: "8th Swung"},
            { value: 5, label: "8th Trip"},
            { value: 6, label: "16th"},
            { value: 7, label: "16th Swung"},
            { value: 8, label: "16th Trip"},
            { value: 9, label: "32nd"}
        ]

        this.parameters["arp_time_sig"] = new SelectParameter("arp_time_sig", "Arp Time Sig", nrpnmsb(163), 6, arp_time)
        this.parameters["bpm"] = new IntParameter("bpm", "BPM", nrpn(167), 120, 30, 250)
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