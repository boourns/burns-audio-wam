import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration, WamParameterDataMap, WamParameterInfoMap, WamSysexEvent } from "@webaudiomodules/api";
import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

import { SelectOption, SelectParameter } from "./SelectParameter";
import { IntParameter, SynthParameter } from "./IntParameter";
import { ControlChangeMessager } from "./ControlChangeMessager";
import { NRPNMSBMessager } from "./NRPNMSBMessager"
import { MIDIControllerKernel } from "./MIDIControllerKernel";
import { SysexMessager } from "./SysexMessager";
import { BooleanParameter } from "./BooleanParameter";

export class MicrokorgKernel implements MIDIControllerKernel {
    parameters: Record<string, SynthParameter>
    vocoderParameters: Record<string, SynthParameter>

    midiDirty: boolean
    paramDirty: boolean

    constructor() {
        this.parameters = {}
        this.vocoderParameters = {}

        this.initTimbre(1)
        this.initTimbre(2)

        this.parameters["modfx_speed"] = new IntParameter("modfx_speed", "ModFX LFO Speed", new ControlChangeMessager(12), 0, 0, 127)
        this.parameters["modfx_depth"] = new IntParameter("modfx_depth", "ModFX Depth", new ControlChangeMessager(93), 0, 0, 127)
        
        const modfxTypes: SelectOption[] = [
            {value: 0, label: "Chorus/Flanger"},
            {value: 1, label: "Ensemble"},
            {value: 2, label: "Phaser"}
        ]

        this.parameters["modfx_type"] = new SelectParameter("modfx_type", "ModFX Type", new SysexMessager(), 0, modfxTypes)

        this.parameters["delay_time"] = new IntParameter("delay_time", "Delay Time", new ControlChangeMessager(13), 0, 0, 127)
        this.parameters["delay_depth"] = new IntParameter("delay_depth", "Delay Depth", new ControlChangeMessager(94), 0, 0, 127)
        this.parameters["delay_sync"] = new BooleanParameter("delay_sync", "Delay Sync", new SysexMessager(), 0, 0, 1)
        
        const delayTimebase: SelectOption[] = [
            { value: 0, label: "1/32" },
            { value: 1, label: "1/24"},
            { value: 2, label: "1/16"},
            { value: 3, label: "1/12"},
            { value: 4, label: "3/32"},
            { value: 5, label: "1/8" },
            { value: 6, label: "1/6"},
            { value: 7, label: "3/16"},
            { value: 8, label: "1/4" },
            { value: 9, label: "1/3" },
            { value: 10, label: "3/8" },
            { value: 11, label: "1/2" },
            { value: 12, label: "2/3" },
            { value: 13, label: "3/4" },
            { value: 14, label: "1/1" },
        ]
        this.parameters["delay_sync_division"] = new SelectParameter("delay_sync_division", "Delay Sync Division", new SysexMessager(), 0, delayTimebase)

        const delayTypes: SelectOption[] = [
            { value: 0, label:"Stereo"},
            { value: 1, label:"Cross"},
            { value: 2, label:"L/R"}
        ]
        this.parameters["delay_type"] = new SelectParameter("delay_type", "Delay Type", new SysexMessager(), 0, delayTypes)

        // NOTE TODO, Timbre select
        // CC #95 0:Timbre1, 1:Timbre1&2(Sync), 127:Timbre2
        // can we select this and then send a bunch of messages to set a separate second timbre?

        const off_on: SelectOption[] = [
            { value: 0, label: "Off" },
            { value: 127, label: "On" }
        ]

        this.parameters["arp_enabled"] = new SelectParameter("arp_enabled", "Arpeggiator", new NRPNMSBMessager(false, 0, 2), 0, off_on)
        const arp_range: SelectOption[] = [
            { value: 0, label: "1 Oct" },
            { value: 1, label: "2 Oct" },
            { value: 2, label: "3 Oct" },
            { value: 3, label: "4 Oct" },
        ]

        this.parameters["arp_range"] = new SelectParameter("arp_range", "Arp Range", new NRPNMSBMessager(false, 0, 3), 0, arp_range)
        this.parameters["arp_latch"] = new SelectParameter("arp_latch", "Arp Latch", new NRPNMSBMessager(false, 0, 4), 0, off_on)

        const arp_type: SelectOption[] = [
            { value: 0, label: "Up" },
            { value: 26, label: "Down" },
            { value: 51, label: "Alt1" },
            { value: 77, label: "Alt2" },
            { value: 102, label: "Random" },
            { value: 127, label: "Trigger" }
        ]
        this.parameters["arp_type"] = new SelectParameter("arp_type", "Arp Type", new NRPNMSBMessager(false, 0, 7), 0, arp_type)
        this.parameters["arp_gate"] = new IntParameter("arp_gate", "Arp Gate Len", new SysexMessager(), 50, 0, 100)
        this.parameters["arp_steps"] = new IntParameter("arp_steps", "Arp Steps", new SysexMessager(), 8, 1, 8)

        for (let i = 1; i < 9; i++) {
            this.parameters[`arp_step_${i}`] = new BooleanParameter(`arp_step_${i}`, `Arp Step ${i}`, new SysexMessager(), 1, 0, 1)
        }
        this.parameters["arp_tempo"] = new IntParameter("arp_tempo", "Arp Tempo", new SysexMessager(), 120, 20, 300)

        const arpTargets: SelectOption[] = [
            {value: 0, label: "Both"},
            {value: 1, label: "Timbre 1"},
            {value: 2, label: "Timbre 3"}
        ]
        this.parameters["arp_target"] = new SelectParameter("arp_target", "Arp Target", new SysexMessager(), 0, arpTargets)
        this.parameters["arp_key_sync"] = new BooleanParameter("arp_key_sync", "Arp Key Sync", new SysexMessager(), 0, 0, 1)

        const arpResolution: SelectOption[] = [
            {value: 0, label: "1/24"},
            {value: 1, label: "1/16"},
            {value: 2, label: "1/12"},
            {value: 3, label: "1/8"},
            {value: 4, label: "1/6"},
            {value: 5, label: "1/4"}
        ]
        this.parameters["arp_resolution"] = new SelectParameter("arp_resolution", "Arp Resolution", new SysexMessager(), 1, arpResolution)
        this.parameters["arp_swing"] = new IntParameter("arp_swing", "Arp Swing", new SysexMessager(), 50, 0, 100)

        const voice_types: SelectOption[] = [
            { value: 0, label: "Single" },
            { value: 2, label: "Layer" },
            { value: 3, label: "Vocoder" },
        ]
        this.parameters["voice_mode"] = new SelectParameter("voice_mode", "Voice Mode", new SysexMessager(), 0, voice_types)

        // EQ
        const hiFreqs: SelectOption[] = [
            { value: 0, label: "1.00kHz" },
            { value: 1, label: "1.25kHz" },
            { value: 2, label: "1.50kHz" },
            { value: 3, label: "1.75kHz" },
            { value: 4, label: "2.00kHz" },
            { value: 5, label: "2.25kHz" },
            { value: 6, label: "2.50kHz" },
            { value: 7, label: "2.75kHz" },
            { value: 8, label: "3.00kHz" },
            { value: 9, label: "3.25kHz" },
            { value: 10, label: "3.50kHz" },
            { value: 11, label: "3.75kHz" },
            { value: 12, label: "4.00kHz" },
            { value: 13, label: "4.25kHz" },
            { value: 14, label: "4.50kHz" },
            { value: 15, label: "4.75kHz" },
            { value: 16, label: "5.00kHz" },
            { value: 17, label: "5.25kHz" },
            { value: 18, label: "5.50kHz" },
            { value: 19, label: "5.75kHz" },
            { value: 20, label: "6.00kHz" },
            { value: 21, label: "7.00kHz" },
            { value: 22, label: "8.00kHz" },
            { value: 23, label: "9.00kHz" },
            { value: 24, label: "10.0kHz" },
            { value: 25, label: "11.0kHz" },
            { value: 26, label: "12.0kHz" },
            { value: 27, label: "14.0kHz" },
            { value: 28, label: "16.0kHz" },
            { value: 29, label: "18.0kHz" }
        ]
        this.parameters["eq_hi_freq"] = new SelectParameter("eq_hi_freq", "EQ Hi Freq", new SysexMessager(), 16, hiFreqs)
        this.parameters["eq_hi_gain"] = new IntParameter("eq_hi_gain", "EQ Hi Gain", new SysexMessager(), 0, -12, 12)

        const loFreqs = [
            { value: 0, label: "40Hz" },
            { value: 1, label: "50Hz" },
            { value: 2, label: "60Hz" },
            { value: 3, label: "80Hz" },
            { value: 4, label: "100Hz" },
            { value: 5, label: "120Hz" },
            { value: 6, label: "140Hz" },
            { value: 7, label: "160Hz" },
            { value: 8, label: "180Hz" },
            { value: 9, label: "200Hz" },
            { value: 10, label: "220Hz" },
            { value: 11, label: "240Hz" },
            { value: 12, label: "260Hz" },
            { value: 13, label: "280Hz" },
            { value: 14, label: "300Hz" },
            { value: 15, label: "320Hz" },
            { value: 16, label: "340Hz" },
            { value: 17, label: "360Hz" },
            { value: 18, label: "380Hz" },
            { value: 19, label: "400Hz" },
            { value: 20, label: "420Hz" },
            { value: 21, label: "440Hz" },
            { value: 22, label: "460Hz" },
            { value: 23, label: "480Hz" },
            { value: 24, label: "500Hz" },
            { value: 25, label: "600Hz" },
            { value: 26, label: "700Hz" },
            { value: 27, label: "800Hz" },
            { value: 28, label: "900Hz" },
            { value: 29, label: "1000Hz" },
        ]
        this.parameters["eq_lo_freq"] = new SelectParameter("eq_lo_freq", "EQ Lo Freq", new SysexMessager(), 16, loFreqs)
        this.parameters["eq_lo_gain"] = new IntParameter("eq_lo_gain", "EQ Lo Gain", new SysexMessager(), 0, -12, 12)

        this.parameters["keyboard_oct"] = new IntParameter("keyboard_oct", "Keyboard Octave", new SysexMessager(), 0, -3,3)

        // TODO how do we merge/display/update vocoder parameters with the rest?
        this.parameters["voc_ch1_level"] = new IntParameter("voc_ch1_level", "Ch1 Level", new NRPNMSBMessager(false, 4, 16), 100, 0, 127)
        this.parameters["voc_ch2_level"] = new IntParameter("voc_ch2_level", "Ch2 Level", new NRPNMSBMessager(false, 4, 18), 100, 0, 127)
        this.parameters["voc_ch3_level"] = new IntParameter("voc_ch3_level", "Ch3 Level", new NRPNMSBMessager(false, 4, 20), 100, 0, 127)
        this.parameters["voc_ch4_level"] = new IntParameter("voc_ch4_level", "Ch4 Level", new NRPNMSBMessager(false, 4, 22), 100, 0, 127)
        this.parameters["voc_ch5_level"] = new IntParameter("voc_ch5_level", "Ch5 Level", new NRPNMSBMessager(false, 4, 24), 100, 0, 127)
        this.parameters["voc_ch6_level"] = new IntParameter("voc_ch6_level", "Ch6 Level", new NRPNMSBMessager(false, 4, 26), 100, 0, 127)
        this.parameters["voc_ch7_level"] = new IntParameter("voc_ch7_level", "Ch7 Level", new NRPNMSBMessager(false, 4, 28), 100, 0, 127)
        this.parameters["voc_ch8_level"] = new IntParameter("voc_ch8_level", "Ch8 Level", new NRPNMSBMessager(false, 4, 30), 100, 0, 127)

        this.parameters["voc_ch1_pan"] = new IntParameter("voc_ch1_pan", "Ch1 Pan", new NRPNMSBMessager(false, 4, 32), 0, -64, 63)
        this.parameters["voc_ch2_pan"] = new IntParameter("voc_ch2_pan", "Ch2 Pan", new NRPNMSBMessager(false, 4, 34), 0, -64, 63)
        this.parameters["voc_ch3_pan"] = new IntParameter("voc_ch3_pan", "Ch3 Pan", new NRPNMSBMessager(false, 4, 36), 0, -64, 63)
        this.parameters["voc_ch4_pan"] = new IntParameter("voc_ch4_pan", "Ch4 Pan", new NRPNMSBMessager(false, 4, 38), 0, -64, 63)
        this.parameters["voc_ch5_pan"] = new IntParameter("voc_ch5_pan", "Ch5 Pan", new NRPNMSBMessager(false, 4, 40), 0, -64, 63)
        this.parameters["voc_ch6_pan"] = new IntParameter("voc_ch6_pan", "Ch6 Pan", new NRPNMSBMessager(false, 4, 42), 0, -64, 63)
        this.parameters["voc_ch7_pan"] = new IntParameter("voc_ch7_pan", "Ch7 Pan", new NRPNMSBMessager(false, 4, 44), 0, -64, 63)
        this.parameters["voc_ch8_pan"] = new IntParameter("voc_ch8_pan", "Ch8 Pan", new NRPNMSBMessager(false, 4, 46), 0, -64, 63)


    }

    initTimbre(t: number) {
        let p = ""
        let l = ""
        if (t == 2) {
            p = "t2_"
            l = "T2:"
        }

        const voiceAssigns: SelectOption[] = [
            { value: 0, label: "Mono"},
            { value: 1, label: "Poly"},
            { value: 2, label: "Unison"}
        ]
        this.parameters[p + "voice_assign"] = new SelectParameter(p + "voice_assign", l + "Voice Assign", new SysexMessager(), 0, voiceAssigns)
        this.parameters[p + "eg1_reset"] = new BooleanParameter(p + "eg1_reset", l + "EG1 Reset", new SysexMessager(), 1, 0, 1)
        this.parameters[p + "eg2_reset"] = new BooleanParameter(p + "eg2_reset", l + "EG2 Reset", new SysexMessager(), 1, 0, 1)
        
        const trigModes: SelectOption[] = [
            { value: 0, label: "Single"},
            { value: 1, label: "Multi"},
        ]
        this.parameters[p + "trig_mode"] = new SelectParameter(p + "trig_mode", l + "Trig Mode", new SysexMessager(), 0, trigModes)
        this.parameters[p + "unison_detune"] = new IntParameter(p + "unison_detune", l + "Unison Detune", new SysexMessager(), 0, 0 , 100)

        this.parameters[p + "tune"] = new IntParameter(p + "tune", l + "Tune", new SysexMessager(), 0, -50, +50)
        this.parameters[p + "bend_range"] = new IntParameter(p + "bend_range", l + "Bend Range", new SysexMessager(), 0, -12, +12)
        this.parameters[p + "transpose"] = new IntParameter(p + "transpose", l + "Transpose", new SysexMessager(), 0, -24, +24)
        this.parameters[p + "vibrato"] = new IntParameter(p + "vibrato", l + "Vibrato", new SysexMessager(), 0, -63, +63)

        this.parameters[p + "portamento"] = new IntParameter(p+ "portamento", l + "Portamento", new ControlChangeMessager(5), 0, 0, 127)

        const osc1WaveOptions: SelectOption[] = [
            { value: 0, label: "Saw" },
            { value: 18, label: "Square" },
            { value: 36, label: "Triangle" },
            { value: 54, label: "Sine" },
            { value: 72, label: "Vox Wave" },
            { value: 90, label: "DWGS" },
            { value: 108, label: "Noise" },
            { value: 126, label: "Audio In" }
        ]

        this.parameters[p + "osc1_wave"] = new SelectParameter(p + "osc1_wave", l + "OSC1 Waveform", new ControlChangeMessager(77), 0, osc1WaveOptions)
        this.parameters[p + "osc1_control1"] = new IntParameter(p + "osc1_control1", l + "OSC1 Control1", new ControlChangeMessager(14), 0, 0, 127)
        this.parameters[p + "osc1_control2"] = new IntParameter(p + "osc1_control2", l + "OSC1 Control2", new ControlChangeMessager(15), 0, 0, 127)

        const osc2WaveOptions: SelectOption[] = [
            { value: 0, label: "Saw" },
            { value: 64, label: "Square" },
            { value: 127, label: "Triangle" }
        ]

        const oscModOptions: SelectOption[] = [
            { value: 0, label: "Off" },
            { value: 43, label: "Ring Mod" },
            { value: 85, label: "Sync" },
            { value: 127, label: "Ring&Sync" }
        ]

        this.parameters[p + "osc2_wave"] = new SelectParameter(p + "osc2_wave", l + "OSC2 Waveform", new ControlChangeMessager(78), 0, osc2WaveOptions)
        this.parameters[p + "osc_mod"] = new SelectParameter(p + "osc_mod", l + "OSC Modulation", new ControlChangeMessager(82), 0, oscModOptions)
        this.parameters[p + "osc2_tune"] = new IntParameter(p + "osc2_tune", l + "OSC2 Tune", new SysexMessager, 0, -24, 24)
        this.parameters[p + "osc2_finetune"] = new IntParameter(p + "osc2_finetune", l + "OSC2 Finetune", new ControlChangeMessager(19), 0, -64, 63)

        this.parameters[p + "mixer_osc1"] = new IntParameter(p + "mixer_osc1", l + "OSC1 Level", new ControlChangeMessager(20), 100, 0, 127)
        this.parameters[p + "mixer_osc2"] = new IntParameter(p + "mixer_osc2", l + "OSC2 Level", new ControlChangeMessager(21), 0, 0, 127)
        this.parameters[p + "mixer_noise"] = new IntParameter(p + "mixer_noise", l + "Noise Level", new ControlChangeMessager(22), 0, 0, 127)

        const filterTypes: SelectOption[] = [
            { value: 0, label: "-24LPF" },
            { value: 43, label: "-12LPF" },
            { value: 85, label: "-12BPF" },
            { value: 127, label: "-12HPF" }
        ]
        this.parameters[p + "filter_type"] = new SelectParameter(p + "filter_type", l + "Filter Type", new ControlChangeMessager(83), 0, filterTypes)
        this.parameters[p + "filter_cutoff"] = new IntParameter(p + "filter_freq", l + "Filter Frequency", new ControlChangeMessager(74), 100, 0, 127)
        this.parameters[p + "filter_res"] = new IntParameter(p + "filter_res", l + "Filter Resonance", new ControlChangeMessager(71), 0, 0, 127)
        this.parameters[p + "filter_env"] = new IntParameter(p + "filter_env", l + "Filter Env Depth", new ControlChangeMessager(79), 0, -64, 63)
        this.parameters[p + "filter_keyboard"] = new IntParameter(p + "filter_keyboard", l + "Filter Keyboard Track", new ControlChangeMessager(85), 0, -64, 63)

        this.parameters[p + "f_eg_attack"] = new IntParameter(p + "f_eg_attack", l + "Filter EG Attack", new ControlChangeMessager(23), 0, 0, 127)
        this.parameters[p + "f_eg_decay"] = new IntParameter(p + "f_eg_decay", l + "Filter EG Decay", new ControlChangeMessager(24), 0, 0, 127)
        this.parameters[p + "f_eg_sustain"] = new IntParameter(p + "f_eg_sustain", l + "Filter EG Sustain", new ControlChangeMessager(25), 0, 0, 127)
        this.parameters[p + "f_eg_release"] = new IntParameter(p + "f_eg_release", l + "Filter EG Release", new ControlChangeMessager(26), 0, 0, 127)

        this.parameters[p + "amp_level"] = new IntParameter(p + "amp_level", l + "Amp Level", new ControlChangeMessager(7), 100, 0, 127)
        this.parameters[p + "amp_pan"] = new IntParameter(p + "amp_pan", l + "Amp Pan", new ControlChangeMessager(10), 0, -64, 63)

        const off_on: SelectOption[] = [
            { value: 0, label: "Off" },
            { value: 127, label: "On" }
        ]
        this.parameters[p + "amp_distortion"] = new SelectParameter(p + "amp_distortion", l + "Distortion", new ControlChangeMessager(92), 0, off_on)

        this.parameters[p + "amp_eg_attack"] = new IntParameter(p + "amp_eg_attack", l + "Amp EG Attack", new ControlChangeMessager(73), 0, 0, 127)
        this.parameters[p + "amp_eg_decay"] = new IntParameter(p + "amp_eg_decay", l + "Amp EG Decay", new ControlChangeMessager(75), 50, 0, 127)
        this.parameters[p + "amp_eg_sustain"] = new IntParameter(p + "amp_eg_sustain", l + "Amp EG Sustain", new ControlChangeMessager(70), 50, 0, 127)
        this.parameters[p + "amp_eg_release"] = new IntParameter(p + "amp_eg_release", l + "Amp EG Release", new ControlChangeMessager(72), 15, 0, 127)

        this.parameters[p + "amp_keyboard"] = new IntParameter(p + "amp_keybord", l + "Amp Kybd Track", new SysexMessager(), 0, -63, 63)

        const lfo1Waves: SelectOption[] = [
            { value: 0, label: "Saw" },
            { value: 43, label: "Square" },
            { value: 85, label: "Triangle" },
            { value: 127, label: "S/H" }
        ]

        const lfo2Waves: SelectOption[] = [
            { value: 0, label: "Saw" },
            { value: 43, label: "Square" },
            { value: 85, label: "Triangle" },
            { value: 127, label: "S/H" }
        ]

        const lfoKeySync: SelectOption[] = [
            {value: 0, label: "Off"},
            {value: 1, label: "Timbre"},
            {value: 2, label: "Voice"},
        ]

        const lfoTimeBase: SelectOption[] = [
{value:0, label: "1/1"},
{value:1, label: "3/4"},
{value:2, label: "2/3"},
{value:3, label: "1/2"},
{value:4, label: "3/8"},
{value:5, label: "1/3"},
{value:6, label: "1/4"},
{value:7, label: "3/16"},
{value:8, label: "1/6"},
{value:9, label: "1/8"},
{value:10, label: "3/32"},
{value:11, label: "1/12"},
{value:12, label: "1/16"},
{value:13, label: "1/24"},
{value:14, label: "1/32"},
        ]

        this.parameters[p + "lfo1_wave"] = new SelectParameter(p + "lfo1_wave", l + "LFO1 Wave", new ControlChangeMessager(87), 0, lfo1Waves)
        this.parameters[p + "lfo1_freq"] = new IntParameter(p + "lfo1_freq", l + "LFO1 Freq", new ControlChangeMessager(27), 0, 0, 127)
        this.parameters[p + "lfo1_keysync"] = new SelectParameter(p + "lfo1_keysync", l + "LFO1 Key Sync", new SysexMessager(), 0, lfoKeySync)
        this.parameters[p + "lfo1_temposync"] = new SelectParameter(p + "lfo1_temposync", l + "LFO1 Tempo Sync", new SysexMessager(), 0, off_on)
        this.parameters[p + "lfo1_timebase"] = new SelectParameter(p + "lfo1_timebase", l + "LFO1 Timebase", new SysexMessager(), 0, lfoTimeBase)

        this.parameters[p + "lfo2_wave"] = new SelectParameter(p + "lfo2_wave", l + "LFO2 Wave", new ControlChangeMessager(88), 0, lfo2Waves)
        this.parameters[p + "lfo2_freq"] = new IntParameter(p + "lfo2_freq", l + "LFO2 Freq", new ControlChangeMessager(76), 0, 0, 127)
        this.parameters[p + "lfo2_keysync"] = new SelectParameter(p + "lfo2_keysync", l + "LFO2 Key Sync", new SysexMessager(), 0, lfoKeySync)
        this.parameters[p + "lfo2_temposync"] = new SelectParameter(p + "lfo2_temposync", l + "LFO2 Tempo Sync", new SysexMessager(), 0, off_on)
        this.parameters[p + "lfo2_timebase"] = new SelectParameter(p + "lfo2_timebase", l + "LFO2 Timebase", new SysexMessager(), 0, lfoTimeBase)

        this.parameters[p + "patch1_level"] = new IntParameter(p + "patch1_lebel", l + "Patch1 Level", new ControlChangeMessager(28), 0, -64, 63)
        this.parameters[p + "patch2_level"] = new IntParameter(p + "patch2_lebel", l + "Patch2 Level", new ControlChangeMessager(29), 0, -64, 63)
        this.parameters[p + "patch3_level"] = new IntParameter(p + "patch3_lebel", l + "Patch3 Level", new ControlChangeMessager(30), 0, -64, 63)
        this.parameters[p + "patch4_level"] = new IntParameter(p + "patch4_lebel", l + "Patch4 Level", new ControlChangeMessager(31), 0, -64, 63)

        const patchSources: SelectOption[] = [
            { value: 0, label: "Filter EG" },
            { value: 18, label: "Amp EG" },
            { value: 36, label: "LFO1" },
            { value: 54, label: "LFO2" },
            { value: 72, label: "VELOCITY" },
            { value: 90, label: "KBD TRACK" },
            { value: 108, label: "Pitch Bend" },
            { value: 126, label: "Mod wheel" }
        ]

        const patchDest: SelectOption[] = [
            { value: 0, label: "Pitch" },
            { value: 18, label: "Osc2 Pitch" },
            { value: 36, label: "Osc1 CTRL1" },
            { value: 54, label: "Noise Level" },
            { value: 72, label: "Cutoff" },
            { value: 90, label: "Amp" },
            { value: 108, label: "Pan" },
            { value: 126, label: "LFO2 Freq" }
        ]

        this.parameters[p + "patch1_src"] = new SelectParameter(p + "patch1_src", l + "Patch1 Src", new NRPNMSBMessager(false, 4, 0), 0, patchSources)
        this.parameters[p + "patch2_src"] = new SelectParameter(p + "patch2_src", l + "Patch2 Src", new NRPNMSBMessager(false, 4, 1), 0, patchSources)
        this.parameters[p + "patch3_src"] = new SelectParameter(p + "patch3_src", l + "Patch3 Src", new NRPNMSBMessager(false, 4, 2), 0, patchSources)
        this.parameters[p + "patch4_src"] = new SelectParameter(p + "patch4_src", l + "Patch4 Src", new NRPNMSBMessager(false, 4, 3), 0, patchSources)

        this.parameters[p + "patch1_dest"] = new SelectParameter(p + "patch1_dest", l + "Patch1 Dest", new NRPNMSBMessager(false, 4, 8), 0, patchDest)
        this.parameters[p + "patch2_dest"] = new SelectParameter(p + "patch2_dest", l + "Patch2 Dest", new NRPNMSBMessager(false, 4, 9), 0, patchDest)
        this.parameters[p + "patch3_dest"] = new SelectParameter(p + "patch3_dest", l + "Patch3 Dest", new NRPNMSBMessager(false, 4, 10), 0, patchDest)
        this.parameters[p + "patch4_dest"] = new SelectParameter(p + "patch4_dest", l + "Patch4 Dest", new NRPNMSBMessager(false, 4, 11), 0, patchDest)

    }

    wamParameters(): Record<string, WamParameterConfiguration> {
        let result: Record<string, WamParameterConfiguration> = {}
        for (let id of Object.keys(this.parameters)) {
            result[id] = this.parameters[id].toWAM()
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

        for (let id of Object.keys(values)) {
            if (this.parameters[id].parameterUpdate(values[id])) {
                result = true
            }
        }

        return result
    }

    automationMessages(force: boolean): WamAutomationEvent[] {
        return Object.keys(this.parameters).map(id => this.parameters[id].automationMessage(force)).filter(ev => ev !== undefined)
    }

    sysexNeeded() {
        return Object.keys(this.parameters).some(id => this.parameters[id].sysexNeeded())
    }

    toSysex(channel: number): Uint8Array {
        let sysex: number[] = []

        // 'party'
        sysex.push(70, 61, 72, 74, 79, 32, 32, 32, 32, 32, 32, 32)

        // (dummy bytes)
        sysex.push(0, 0) // 12, 13

        // arp steps
        sysex.push(this.parameters["arp_steps"].value - 1) // 14

        // arp pattern
        let pattern = 0
        for (let i = 0; i < 8; i++) {
            if (this.parameters[`arp_step_${i + 1}`].value == 0) {
                pattern |= (1 << i)
            }
        }
        sysex.push(pattern) // 15

        const voice_mode = this.parameters["voice_mode"] as SelectParameter

        // byte 16: Voice Mode)
        sysex.push(0x40 | (voice_mode.options[voice_mode.value].value << 4))

        // byte 17: scale key and type (not used)
        sysex.push(0)

        sysex.push(60) // byte 18: dummy byte

        let delay_sync = (this.parameters["delay_sync"].value == 1) ? 0x80 : 0
        const syncbase = this.parameters["delay_sync_division"] as SelectParameter
        delay_sync |= syncbase.options[syncbase.value].value
        sysex.push(delay_sync) // byte 19: delay sync + timebase

        sysex.push(this.parameters["delay_time"].value) // 20
        sysex.push(this.parameters["delay_depth"].value) // 21

        sysex.push(this.parameters["delay_type"].value) // 22

        sysex.push(this.parameters["modfx_speed"].value) // 23
        sysex.push(this.parameters["modfx_depth"].value) // 24
        sysex.push(this.parameters["modfx_type"].value) // 25
        sysex.push(this.parameters["eq_hi_freq"].value) // 26
        sysex.push(64 + this.parameters["eq_hi_gain"].value) // 27
        sysex.push(this.parameters["eq_lo_freq"].value) // 28
        sysex.push(64 + this.parameters["eq_lo_gain"].value) // 29

        const tempo = this.parameters["arp_tempo"].value // 20-300
        // 30, 31
        sysex.push(tempo >> 8)
        sysex.push(tempo & 0xff)

        let arp = 0
        if (this.parameters["arp_enabled"].value > 0) {
            arp |= 0x80
        }
        if (this.parameters["arp_latch"].value > 0) {
            arp |= 0x40
        }
        arp |= (this.parameters["arp_target"].value << 4)
        arp |= this.parameters["arp_key_sync"].value
        sysex.push(arp) // 32

        let arpTypeRange = this.parameters["arp_type"].value
        arpTypeRange |= (this.parameters["arp_range"].value << 4)
        sysex.push(arpTypeRange) // 33

        sysex.push(this.parameters["arp_gate"].value) // 34

        sysex.push(this.parameters["arp_resolution"].value) // 35
        sysex.push(this.parameters["arp_swing"].value) // 36

        let oct = this.parameters["keyboard_oct"].value
        if (oct < 0) {
            oct += 256
        }
        sysex.push(oct) // 37, keyboard octave

        switch (voice_mode.value) {
            case 0:
            case 1:
                sysex = this.timbreToSysex(1, sysex)
                sysex = this.timbreToSysex(2, sysex)
                break
            case 2:
                sysex = this.vocoderToSysex(sysex)
                break
        }

        while (sysex.length < 254) {
            sysex.push(64)
        }

        let packed = this.packKorg(sysex)

        const preamble = [0xf0, 0x42, 0x30 | channel, 0x58, 0x4c]

        return new Uint8Array([...preamble, ...packed, 0xf7])
    }

    vocoderToSysex(sysex: number[]) {
        return sysex
    }

    timbreToSysex(t: number, sysex: number[]): number[] {
        let p = ""
        if (t == 2) {
            p = "t2_"
        }

        sysex.push(255) // 0

        let assign = this.parameters[p+"voice_assign"].value << 6
        assign |= (this.parameters[p+"eg2_reset"].value) << 5
        assign |= (this.parameters[p+"eg1_reset"].value) << 4
        assign |= (this.parameters[p+"trig_mode"].value) << 3
        sysex.push(assign) // +1

        sysex.push(this.parameters[p + "unison_detune"].value) // +2
        sysex.push(64 + this.parameters[p + "tune"].value) // +3
        sysex.push(64 + this.parameters[p + "bend_range"].value) // +4
        sysex.push(64 + this.parameters[p + "transpose"].value) // +5
        sysex.push(64 + this.parameters[p + "vibrato"].value) // +6

        const wave = this.parameters[p+"osc1_wave"]
        sysex.push(wave.value) // +7
        sysex.push(this.parameters[p+"osc1_control1"].value) // +8
        sysex.push(this.parameters[p+"osc1_control2"].value) // +9

        if (wave.value == 5) {
            let dwgs = this.parameters[p + "osc1_control2"].value
            if (dwgs > 64) {
                dwgs = 64
            }
            sysex.push(dwgs) // +10
        } else {
            sysex.push(0) // +10
        }

        sysex.push(0) // +11
        let osc2 = this.parameters[p + "osc2_wave"].value
        osc2 |= this.parameters[p + "osc_mod"].value << 4
        sysex.push(osc2) // +12

        sysex.push(64 + this.parameters[p + "osc2_tune"].value) // +13
        sysex.push(64 + this.parameters[p + "osc2_finetune"].value) // +14
        sysex.push(this.parameters[p+"portamento"].value) // +15

        sysex.push(this.parameters[p + "mixer_osc1"].value) // +16
        sysex.push(this.parameters[p + "mixer_osc2"].value) // +17
        sysex.push(this.parameters[p + "mixer_noise"].value) // +18

        sysex.push(this.parameters[p + "filter_type"].value) // +19
        sysex.push(this.parameters[p + "filter_cutoff"].value) // +20
        sysex.push(this.parameters[p + "filter_res"].value) // +21
        sysex.push(64+this.parameters[p + "filter_env"].value) // +22
        sysex.push(64) // +23 (filter -> velocity)
        sysex.push(64+this.parameters[p + "filter_keyboard"].value) // +24

        sysex.push(this.parameters[p + "amp_level"].value) // +25
        sysex.push(64 + this.parameters[p + "amp_pan"].value) // +26
        sysex.push(this.parameters[p + "amp_distortion"].value) // +27

        sysex.push(64) // +28 Velocity Sense
        sysex.push(63 + this.parameters[p + "amp_keyboard"].value) // +29

        sysex.push(this.parameters[p + "f_eg_attack"].value) // +30
        sysex.push(this.parameters[p + "f_eg_decay"].value)
        sysex.push(this.parameters[p + "f_eg_sustain"].value)
        sysex.push(this.parameters[p + "f_eg_release"].value)

        sysex.push(this.parameters[p + "amp_eg_attack"].value) // +34
        sysex.push(this.parameters[p + "amp_eg_decay"].value)
        sysex.push(this.parameters[p + "amp_eg_sustain"].value)
        sysex.push(this.parameters[p + "amp_eg_release"].value)

        let lfo = this.parameters[p + "lfo1_wave"].value
        lfo |= this.parameters[p + "lfo1_keysync"].value << 4

        sysex.push(lfo) // +38
        sysex.push(this.parameters[p+"lfo1_freq"].value) // +39
        
        lfo = (this.parameters[p + "lfo1_temposync"].value << 7)
        lfo |= this.parameters[p + "lfo1_timebase"].value
        sysex.push(lfo) // 40

        lfo = this.parameters[p + "lfo2_wave"].value
        lfo |= this.parameters[p + "lfo2_keysync"].value << 4

        sysex.push(lfo) // +41
        sysex.push(this.parameters[p+"lfo2_freq"].value) // +42
        
        lfo = (this.parameters[p + "lfo2_temposync"].value << 7)
        lfo |= this.parameters[p + "lfo2_timebase"].value
        sysex.push(lfo) // +43

        sysex.push((this.parameters[p+"patch1_dest"].value<<4) | this.parameters[p+"patch1_src"].value)
        sysex.push(this.parameters[p+"patch1_level"].value+64) // +45

        sysex.push((this.parameters[p+"patch2_dest"].value<<4) | this.parameters[p+"patch2_src"].value)
        sysex.push(this.parameters[p+"patch2_level"].value+64) // +47

        sysex.push((this.parameters[p+"patch3_dest"].value<<4) | this.parameters[p+"patch3_src"].value)
        sysex.push(this.parameters[p+"patch3_level"].value+64) // +49

        sysex.push((this.parameters[p+"patch4_dest"].value<<4) | this.parameters[p+"patch4_src"].value)
        sysex.push(this.parameters[p+"patch4_level"].value+64) // +51

        for (let i = 52; i <= 107; i++) {
            // dummy bytes
            sysex.push(64)
        }

        return sysex
    }

    fromSysex(channel: number, sysex: Uint8Array): boolean {
        // TODO note data[2] includes midi channel
        if (sysex[0] != 0xf0 || sysex[1] != 0x42 || sysex[2] != (0x30 | channel) || sysex[3] != 0x58) {
            return false
        }
        if (![0x40, 0x4c].includes(sysex[4])) {
            console.error("sysex not single program data")
            return false
        }

        let data = this.unpackKorg(sysex, 5, sysex.length-1)

        this.parameters["arp_steps"].updateFromSysex(data[14]+1)

        // 15
        for (let i = 0; i < 8; i++) {
            if (data[15] & (0x1<<i)) {
                this.parameters[`arp_step_${i+1}`].updateFromSysex(0)
            } else {
                this.parameters[`arp_step_${i+1}`].updateFromSysex(1)
            }
        }

        let voice_mode = ((data[16] & 0x30) >> 4)
        if (voice_mode > 0) {
            // map 0, 2, 3 onto indices 0, 1, 2
            voice_mode--
        }
        this.parameters['voice_mode'].updateFromSysex(voice_mode)

        const delay = data[19]
        this.parameters['delay_sync'].updateFromSysex((delay & 0x80) ? 1 : 0)
        this.parameters['delay_sync_division'].updateFromSysex(delay & 0x0f)

        this.parameters["delay_time"].updateFromSysex(data[20])
        this.parameters["delay_depth"].updateFromSysex(data[21])
        this.parameters["delay_type"].updateFromSysex(data[22])

        this.parameters["modfx_speed"].updateFromSysex(data[23])
        this.parameters["modfx_depth"].updateFromSysex(data[24])
        this.parameters["modfx_type"].updateFromSysex(data[25])

        this.parameters["eq_hi_freq"].updateFromSysex(data[26])
        this.parameters["eq_hi_gain"].updateFromSysex(data[27]-64)
        this.parameters["eq_lo_freq"].updateFromSysex(data[28])
        this.parameters["eq_lo_gain"].updateFromSysex(data[29]-64)

        const tempo = (data[30] << 8) + data[31]
        
        this.parameters["arp_tempo"].updateFromSysex(tempo)
        const arp = data[32]

        this.parameters["arp_enabled"].updateFromSysex((arp&0x80) ? 1 : 0)
        this.parameters["arp_latch"].updateFromSysex((arp&0x40) ? 1 : 0)
        this.parameters["arp_target"].updateFromSysex((arp&0x30)>>4)
        this.parameters["arp_key_sync"].updateFromSysex((arp&0x01) ? 1 : 0)

        const arpTypeRange = data[33]
        this.parameters["arp_type"].updateFromSysex(arpTypeRange&0x0f)
        this.parameters["arp_range"].updateFromSysex(arpTypeRange>>4)

        this.parameters["arp_gate"].updateFromSysex(data[34])
        this.parameters["arp_resolution"].updateFromSysex(data[35])
        this.parameters["arp_swing"].updateFromSysex(data[36])

        let oct = data[37]
        if (oct > 3) {
            oct -= 256
        }
        this.parameters["keyboard_oct"].updateFromSysex(oct)
        
        switch (voice_mode) {
            case 0:
            case 1:
                this.sysexToTimbre(1, 38, data)
                this.sysexToTimbre(2, 146, data)
                break
            case 2:
                this.sysexToVocoder(data)
                break
        }

        return true
    }

    sysexToTimbre(t: number, idx: number, data: number[]) {
        let p = ""
        if (t == 2) {
            p = "t2_"
        }

        const assign = data[idx+1]
        this.parameters[p+"voice_assign"].updateFromSysex(assign>>6)
        this.parameters[p+"eg2_reset"].updateFromSysex((assign&(0x1<<5)) ? 1 : 0)
        this.parameters[p+"eg1_reset"].updateFromSysex((assign&(0x1<<4)) ? 1 : 0)
        this.parameters[p+"trig_mode"].updateFromSysex((assign&(0x1<<3)) ? 1 : 0)

        this.parameters[p + "unison_detune"].updateFromSysex(data[idx+2])
        this.parameters[p + "tune"].updateFromSysex(data[idx+3]-64)
        this.parameters[p + "bend_range"].updateFromSysex(data[idx+4]-64)
        this.parameters[p + "transpose"].updateFromSysex(data[idx+5]-64)
        this.parameters[p + "vibrato"].updateFromSysex(data[idx+6]-64)
        this.parameters[p+"osc1_wave"].updateFromSysex(data[idx+7])
        this.parameters[p+"osc1_control1"].updateFromSysex(data[idx+8])
        this.parameters[p+"osc1_control2"].updateFromSysex(data[idx+9])

        // TODO do we need a separate param for DWGS (+10)?

        this.parameters[p+"osc2_wave"].updateFromSysex(data[idx+12]&0x0f)
        this.parameters[p+"osc_mod"].updateFromSysex(data[idx+12]>>4)

        this.parameters[p + "osc2_tune"].updateFromSysex((data[idx+13]-64))
        this.parameters[p + "osc2_finetune"].updateFromSysex(data[idx+14]-64)
        this.parameters[p+"portamento"].updateFromSysex(data[idx+15])

        this.parameters[p + "mixer_osc1"].updateFromSysex(data[idx+16])
        this.parameters[p + "mixer_osc2"].updateFromSysex(data[idx+17])
        this.parameters[p + "mixer_noise"].updateFromSysex(data[idx+18])

        this.parameters[p + "filter_type"].updateFromSysex(data[idx+19])
        this.parameters[p + "filter_cutoff"].updateFromSysex(data[idx+20])
        this.parameters[p + "filter_res"].updateFromSysex(data[idx+21])
        this.parameters[p + "filter_env"].updateFromSysex(data[idx+22]-64)
        this.parameters[p + "filter_keyboard"].updateFromSysex(data[idx+24]-64)

        this.parameters[p + "amp_level"].updateFromSysex(data[idx+25])
        this.parameters[p + "amp_pan"].updateFromSysex(data[idx+26]-64)
        this.parameters[p + "amp_distortion"].updateFromSysex(data[idx+27])
        this.parameters[p + "amp_keyboard"].updateFromSysex(data[idx+29] - 63)

        this.parameters[p + "f_eg_attack"].updateFromSysex(data[idx+30])
        this.parameters[p + "f_eg_decay"].updateFromSysex(data[idx+31])
        this.parameters[p + "f_eg_sustain"].updateFromSysex(data[idx+32])
        this.parameters[p + "f_eg_release"].updateFromSysex(data[idx+33])

        this.parameters[p + "amp_eg_attack"].updateFromSysex(data[idx+34])
        this.parameters[p + "amp_eg_decay"].updateFromSysex(data[idx+35])
        this.parameters[p + "amp_eg_sustain"].updateFromSysex(data[idx+36])
        this.parameters[p + "amp_eg_release"].updateFromSysex(data[idx+37])

        this.parameters[p + "lfo1_wave"].updateFromSysex(data[idx+38]&0x0f)
        this.parameters[p + "lfo1_keysync"].updateFromSysex(data[idx+38]>>4)
        this.parameters[p + "lfo1_freq"].updateFromSysex(data[idx+39])
        if (data[idx+40] & 0x80) {
            this.parameters[p + "lfo1_temposync"].updateFromSysex(1)
        } else {
            this.parameters[p + "lfo1_temposync"].updateFromSysex(0)
        }
        this.parameters[p + "lfo1_timebase"].updateFromSysex(data[idx+40] & 0x0f)


        this.parameters[p + "lfo2_wave"].updateFromSysex(data[idx+41]&0x0f)
        this.parameters[p + "lfo2_keysync"].updateFromSysex(data[idx+41]>>4)

        this.parameters[p + "lfo2_freq"].updateFromSysex(data[idx+42])
        if (data[idx+43] & 0x80) {
            this.parameters[p + "lfo2_temposync"].updateFromSysex(1)
        } else {
            this.parameters[p + "lfo2_temposync"].updateFromSysex(0)
        }
        this.parameters[p + "lfo2_timebase"].updateFromSysex(data[idx+43] & 0x0f)
        
        this.parameters[p+"patch1_dest"].updateFromSysex(data[idx+44]>>4)
        this.parameters[p+"patch1_src"].updateFromSysex(data[idx+44]&0x0f)
        this.parameters[p+"patch1_level"].updateFromSysex(data[idx+45]-64)

        this.parameters[p+"patch2_dest"].updateFromSysex(data[idx+46]>>4)
        this.parameters[p+"patch2_src"].updateFromSysex(data[idx+46]&0x0f)
        this.parameters[p+"patch2_level"].updateFromSysex(data[idx+47]-64)

        this.parameters[p+"patch3_dest"].updateFromSysex(data[idx+48]>>4)
        this.parameters[p+"patch3_src"].updateFromSysex(data[idx+48]&0x0f)
        this.parameters[p+"patch3_level"].updateFromSysex(data[idx+49]-64)

        this.parameters[p+"patch4_dest"].updateFromSysex(data[idx+50]>>4)
        this.parameters[p+"patch4_src"].updateFromSysex(data[idx+50]&0x0f)
        this.parameters[p+"patch4_level"].updateFromSysex(data[idx+51]-64)

        // TODO
    }

    sysexToVocoder(data: number[]) {

    }

    midiMessages(channel: number, force: boolean = false): WamMidiEvent[] {
        let results: WamMidiEvent[] = []

        for (let id of Object.keys(this.parameters)) {
            results.push(...this.parameters[id].midiMessage(channel, force))
        }

        return results
    }

    unpackKorg(packed: Uint8Array, startIndex: number, endIndex: number = packed.length): number[] {
        let result: number[] = []

        let i
        for (i = startIndex; i < endIndex; i += 8) {

            for (let j = 0; j < 7; j++) {
                const topBit = ((packed[i] & (0x1 << j)) != 0) ? 0x80 : 0
                
                if (j + i + 1 < endIndex) {
                    result.push(packed[j+i+1] | topBit)
                }
            }
        }

        return result
    }

    packKorg(unpacked: number[]): number[] {
        let result: number[] = []

        let i
        for (i = 0; i < unpacked.length; i += 7) {
            let dataSet: number[] = []
            let topbitByte = 0

            for (let j = 0; j < 7; j++) {
                if (i+j < unpacked.length) {
                    let incoming = unpacked[i + j]
                    if ((incoming & 0x80) != 0) {
                        topbitByte |= 0x1 << j
                        incoming &= 0x7f
                    }
                    dataSet.push(incoming)
                }
            }

            result.push(topbitByte)
            result.push(...dataSet)
        }

        return result
    }
}