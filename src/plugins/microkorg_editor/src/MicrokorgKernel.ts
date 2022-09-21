import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration, WamParameterDataMap, WamParameterInfoMap, WamSysexEvent } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

import { SelectOption, SelectParameter } from "./SelectParameter";
import { IntParameter, SynthParameter } from "./IntParameter";
import { ControlChangeMessager } from "./ControlChangeMessager";
import {NRPNMSBMessager} from "./NRPNMSBMessager"
import { MIDIControllerKernelType } from "./MIDIControllerKernel";

export class MicrokorgKernel implements MIDIControllerKernelType {
    channel: number
    parameters: Record<string, SynthParameter>
    vocoderParameters: Record<string, SynthParameter>

    midiDirty: boolean
    paramDirty: boolean

    constructor() {
        this.channel = -1
        this.parameters = {}
        this.vocoderParameters = {}

        this.parameters.portamento = new IntParameter("portamento", "Portamento", new ControlChangeMessager(5), 0, 0, 127)

        const osc1WaveOptions: SelectOption[] = [
            {value: 0, label: "Saw"},
            {value: 18, label: "Square"},
            {value: 36, label: "Triangle"},
            {value: 54, label: "Sine"},
            {value: 72, label: "Vox Wave"},
            {value: 90, label: "DWGS"},
            {value: 108, label: "Noise"},
            {value: 126, label: "Audio In"}
        ]

        this.parameters["osc1_wave"] = new SelectParameter("osc1_wave", "OSC1 Waveform", new ControlChangeMessager(77), 0, osc1WaveOptions)
        this.parameters["osc1_control1"] = new IntParameter("osc1_control1", "OSC1 Control1", new ControlChangeMessager(14), 0, 0, 127)
        this.parameters["osc1_control2"] = new IntParameter("osc1_control2", "OSC1 Control2", new ControlChangeMessager(15), 0, 0, 127)

        const osc2WaveOptions: SelectOption[] = [
            {value: 0, label: "Saw"},
            {value: 64, label: "Square"},
            {value: 127, label: "Triangle"}
        ]

        const oscModOptions: SelectOption[] = [
            {value: 0, label: "Off"},
            {value: 43, label: "Ring Mod"},
            {value: 85, label: "Sync"},
            {value: 127, label: "Ring&Sync"}
        ]

        this.parameters["osc2_wave"] = new SelectParameter("osc2_wave", "OSC2 Waveform", new ControlChangeMessager(78), 0, osc2WaveOptions)
        this.parameters["osc_mod"] = new SelectParameter("osc_mod", "OSC Modulation", new ControlChangeMessager(82), 0, oscModOptions)
        this.parameters["osc2_tune"] = new IntParameter("osc2_tune", "OSC2 Tune", new ControlChangeMessager(18), 0, -64, 63)
        this.parameters["osc2_finetune"] = new IntParameter("osc2_finetune", "OSC2 Finetune", new ControlChangeMessager(19), 0, -64, 63)

        this.parameters["mixer_osc1"] = new IntParameter("mixer_osc1", "OSC1 Level", new ControlChangeMessager(20), 0, 0, 127)
        this.parameters["mixer_osc2"] = new IntParameter("mixer_osc2", "OSC2 Level", new ControlChangeMessager(21), 0, 0, 127)
        this.parameters["mixer_noise"] = new IntParameter("mixer_noise", "Noise Level", new ControlChangeMessager(22), 0, 0, 127)

        const filterTypes: SelectOption[] = [
            {value: 0, label: "–24LPF"}, 
            {value: 43, label: "–12LPF"}, 
            {value: 85, label: "–12BPF"},
            {value: 127, label: "–12HPF"}
        ]
        this.parameters["filter_type"] = new SelectParameter("filter_type", "Filter Type", new ControlChangeMessager(83), 0, filterTypes)
        this.parameters["filter_cutoff"] = new IntParameter("filter_freq", "Filter Frequency", new ControlChangeMessager(74), 100, 0, 127)
        this.parameters["filter_res"] = new IntParameter("filter_res", "Filter Resonance", new ControlChangeMessager(71), 100, 0, 127)
        this.parameters["filter_env"] = new IntParameter("filter_env", "Filter Env Depth", new ControlChangeMessager(79), 0, -64, 63)
        this.parameters["filter_keyboard"] = new IntParameter("filter_keyboard", "Filter Keyboard Track", new ControlChangeMessager(85), 0, -64, 63)

        this.parameters["f_eg_attack"] = new IntParameter("f_eg_attack", "Filter EG Attack", new ControlChangeMessager(23), 0, 0, 127)
        this.parameters["f_eg_decay"] = new IntParameter("f_eg_decay", "Filter EG Decay", new ControlChangeMessager(24), 0, 0, 127)
        this.parameters["f_eg_sustain"] = new IntParameter("f_eg_sustain", "Filter EG Sustain", new ControlChangeMessager(25), 0, 0, 127)
        this.parameters["f_eg_release"] = new IntParameter("f_eg_release", "Filter EG Release", new ControlChangeMessager(26), 0, 0, 127)

        this.parameters["amp_level"] = new IntParameter("amp_level", "Amp Level", new ControlChangeMessager(7), 0, 0, 127)
        this.parameters["amp_pan"] = new IntParameter("amp_pan", "Amp Pan", new ControlChangeMessager(10), 0, -64, 63)

        const off_on: SelectOption[] = [
            {value: 0, label: "Off"},
            {value: 127, label: "On"}
        ]
        this.parameters["amp_distortion"] = new SelectParameter("amp_distortion", "Distortion", new ControlChangeMessager(92), 0, off_on)

        this.parameters["amp_eg_attack"] = new IntParameter("amp_eg_attack", "Amp EG Attack", new ControlChangeMessager(73), 0, 0, 127)
        this.parameters["amp_eg_decay"] = new IntParameter("amp_eg_decay", "Amp EG Decay", new ControlChangeMessager(75), 0, 0, 127)
        this.parameters["amp_eg_sustain"] = new IntParameter("amp_eg_sustain", "Amp EG Sustain", new ControlChangeMessager(70), 0, 0, 127)
        this.parameters["amp_eg_release"] = new IntParameter("amp_eg_release", "Amp EG Release", new ControlChangeMessager(72), 0, 0, 127)

        const lfo1Waves: SelectOption[] = [
            {value: 0, label:"Saw"}, 
            {value: 43, label:"Square1"}, 
            {value: 85, label: "Triangle"}, 
            {value: 127, label: "S/H"}
        ]

        const lfo2Waves: SelectOption[] = [
            {value: 0, label:"Saw"}, 
            {value: 43, label:"Square2"}, 
            {value: 85, label: "Triangle"}, 
            {value: 127, label: "S/H"}
        ]

        this.parameters["lfo1_wave"] = new SelectParameter("lfo1_wave", "LFO1 Wave", new ControlChangeMessager(87), 0, lfo1Waves)
        this.parameters["lfo1_freq"] = new IntParameter("lfo1_freq", "LFO1 Freq", new ControlChangeMessager(27), 0, 0, 127)
        this.parameters["lfo2_wave"] = new SelectParameter("lfo2_wave", "LFO2 Wave", new ControlChangeMessager(88), 0, lfo2Waves)
        this.parameters["lfo2_freq"] = new IntParameter("lfo2_freq", "LFO2 Freq", new ControlChangeMessager(76), 0, 0, 127)

        this.parameters["patch1_level"] = new IntParameter("patch1_lebel", "Patch1 Level", new ControlChangeMessager(28), 0, -64, 63)
        this.parameters["patch2_level"] = new IntParameter("patch2_lebel", "Patch2 Level", new ControlChangeMessager(29), 0, -64, 63)
        this.parameters["patch3_level"] = new IntParameter("patch3_lebel", "Patch3 Level", new ControlChangeMessager(30), 0, -64, 63)
        this.parameters["patch4_level"] = new IntParameter("patch4_lebel", "Patch4 Level", new ControlChangeMessager(31), 0, -64, 63)

        this.parameters["modfx_speed"] = new IntParameter("modfx_speed", "ModFX LFO Speed", new ControlChangeMessager(12), 0, 0, 127)
        this.parameters["modfx_depth"] = new IntParameter("modfx_depth", "ModFX Depth", new ControlChangeMessager(93), 0, 0, 127)

        this.parameters["delay_time"] = new IntParameter("delay_time", "Delay Time", new ControlChangeMessager(13), 0, 0, 127)
        this.parameters["delay_depth"] = new IntParameter("delay_depth", "Delay Depth", new ControlChangeMessager(94), 0, 0, 127)

        // NOTE TODO, Timbre select
        // CC #95 0:Timbre1, 1:Timbre1&2(Sync), 127:Timbre2
        // can we select this and then send a bunch of messages to set a separate second timbre?

        this.parameters["sync"] = new SelectParameter("sync", "Sync", new ControlChangeMessager(90), 0, off_on)

        this.parameters["arpeggiator"] = new SelectParameter("arp_enabled", "Arpeggiator", new NRPNMSBMessager(false, 0, 2), 0, off_on)
        const arp_range: SelectOption[] = [
            {value: 0, label: "1 Oct"},
            {value: 1, label: "2 Oct"},
            {value: 2, label: "3 Oct"},
            {value: 3, label: "4 Oct"},
        ]

        this.parameters["arp_range"] = new SelectParameter("arp_range", "Arp Range", new NRPNMSBMessager(false, 0, 3), 0, arp_range)
        this.parameters["arp_latch"] = new SelectParameter("arp_latch", "Arp Latch", new NRPNMSBMessager(false, 0, 4), 0, off_on)

        const arp_type: SelectOption[] = [
            {value: 0, label: "Up"},
            {value: 26, label: "Down"}, 
            {value: 51, label: "Alt1"},
            {value: 77, label: "Alt2"},
            {value: 102, label: "Random"},
            {value: 127, label: "Trigger"}
        ]
        this.parameters["arp_type"] = new SelectParameter("arp_type", "Arp Type", new NRPNMSBMessager(false, 0, 7), 0, arp_type)
        this.parameters["arp_gate"] = new IntParameter("arp_gate", "Arp Gate Len", new NRPNMSBMessager(false, 0, 10), 64, 0, 127)

        const patchSources: SelectOption[] = [
            {value: 0, label: "Filter EG"}, 
            {value: 18, label: "Amp EG"}, 
            {value: 36, label: "LFO1"}, 
            {value: 54, label: "LFO2"},
            {value: 72, label: "VELOCITY"},
            {value: 90, label: "KBD TRACK"},
            {value: 108, label: "Mod wheel"}, 
            {value: 126, label: "Pitch"}
        ]

        const patchDest: SelectOption[] = [
            {value: 0, label: "Pitch"}, 
            {value: 18, label: "Osc2 Pitch"},
            {value: 36, label: "Osc1 CTRL1"}, 
            {value: 54, label: "Noise Level"},
            {value: 72, label: "Cutoff"}, 
            {value: 90, label: "Amp"}, 
            {value: 108, label: "Pan"},
            {value: 126, label: "LFO2 Freq"}
        ]

        this.parameters["patch1_src"] = new SelectParameter("patch1_src", "Patch1 Src", new NRPNMSBMessager(false, 4, 0), 0, patchSources)
        this.parameters["patch2_src"] = new SelectParameter("patch2_src", "Patch2 Src", new NRPNMSBMessager(false, 4, 1), 0, patchSources)
        this.parameters["patch3_src"] = new SelectParameter("patch3_src", "Patch3 Src", new NRPNMSBMessager(false, 4, 2), 0, patchSources)
        this.parameters["patch4_src"] = new SelectParameter("patch4_src", "Patch4 Src", new NRPNMSBMessager(false, 4, 3), 0, patchSources)

        this.parameters["patch1_dest"] = new SelectParameter("patch1_dest", "Patch1 Dest", new NRPNMSBMessager(false, 4, 8), 0, patchDest)
        this.parameters["patch2_dest"] = new SelectParameter("patch2_dest", "Patch2 Dest", new NRPNMSBMessager(false, 4, 9), 0, patchDest)
        this.parameters["patch3_dest"] = new SelectParameter("patch3_dest", "Patch3 Dest", new NRPNMSBMessager(false, 4, 10), 0, patchDest)
        this.parameters["patch4_dest"] = new SelectParameter("patch4_dest", "Patch4 Dest", new NRPNMSBMessager(false, 4, 11), 0, patchDest)

        // TODO how do we merge/display/update vocoder parameters with the rest?
        this.vocoderParameters["ch1_level"] = new IntParameter("ch1_level", "Ch1 Level", new NRPNMSBMessager(false, 4, 16), 100, 0, 127)
        this.vocoderParameters["ch2_level"] = new IntParameter("ch2_level", "Ch2 Level", new NRPNMSBMessager(false, 4, 18), 100, 0, 127)
        this.vocoderParameters["ch3_level"] = new IntParameter("ch3_level", "Ch3 Level", new NRPNMSBMessager(false, 4, 20), 100, 0, 127)
        this.vocoderParameters["ch4_level"] = new IntParameter("ch4_level", "Ch4 Level", new NRPNMSBMessager(false, 4, 22), 100, 0, 127)
        this.vocoderParameters["ch5_level"] = new IntParameter("ch5_level", "Ch5 Level", new NRPNMSBMessager(false, 4, 24), 100, 0, 127)
        this.vocoderParameters["ch6_level"] = new IntParameter("ch6_level", "Ch6 Level", new NRPNMSBMessager(false, 4, 26), 100, 0, 127)
        this.vocoderParameters["ch7_level"] = new IntParameter("ch7_level", "Ch7 Level", new NRPNMSBMessager(false, 4, 28), 100, 0, 127)
        this.vocoderParameters["ch8_level"] = new IntParameter("ch8_level", "Ch8 Level", new NRPNMSBMessager(false, 4, 30), 100, 0, 127)

        this.vocoderParameters["ch1_pan"] = new IntParameter("ch1_pan", "Ch1 Pan", new NRPNMSBMessager(false, 4, 32), 0, -64, 63)
        this.vocoderParameters["ch2_pan"] = new IntParameter("ch2_pan", "Ch2 Pan", new NRPNMSBMessager(false, 4, 34), 0, -64, 63)
        this.vocoderParameters["ch3_pan"] = new IntParameter("ch3_pan", "Ch3 Pan", new NRPNMSBMessager(false, 4, 36), 0, -64, 63)
        this.vocoderParameters["ch4_pan"] = new IntParameter("ch4_pan", "Ch4 Pan", new NRPNMSBMessager(false, 4, 38), 0, -64, 63)
        this.vocoderParameters["ch5_pan"] = new IntParameter("ch5_pan", "Ch5 Pan", new NRPNMSBMessager(false, 4, 40), 0, -64, 63)
        this.vocoderParameters["ch6_pan"] = new IntParameter("ch6_pan", "Ch6 Pan", new NRPNMSBMessager(false, 4, 42), 0, -64, 63)
        this.vocoderParameters["ch7_pan"] = new IntParameter("ch7_pan", "Ch7 Pan", new NRPNMSBMessager(false, 4, 44), 0, -64, 63)
        this.vocoderParameters["ch8_pan"] = new IntParameter("ch8_pan", "Ch8 Pan", new NRPNMSBMessager(false, 4, 46), 0, -64, 63)

    }

    wamParameters(): Record<string, WamParameterConfiguration> {
        let result:  Record<string, WamParameterConfiguration> = {}
        for (let id of Object.keys(this.parameters)) {
            result[id] = this.parameters[id].toWAM()
        }

        return result
    }

    ingestMIDI(event: WamMidiData): boolean {
        let result = false

        for (let id of Object.keys(this.parameters)) {
            if (this.parameters[id].ingestMIDI(this.channel, event)) {
                result ||= true
            }
        }
        return false
    }

    ingestSysex(event: WamSysexEvent): boolean {
        // TODO custom sysex interpretation for Microkorg
        return false
    }

    parameterUpdate(params: WamParameterDataMap) {
        for (let id of Object.keys(params)) {
            this.parameters[id].parameterUpdate(params[id].value)
        } 
    }

    automationMessages(force: boolean): WamAutomationEvent[] {
        return Object.keys(this.parameters).map(id => this.parameters[id].automationMessage(force)).filter(ev => ev !== undefined)
    }
}