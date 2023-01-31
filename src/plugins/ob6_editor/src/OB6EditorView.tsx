import { Component, h } from "preact";
import {Knob} from "../../shared/ui/Knob"
import {Select} from "../../shared/ui/Select"

import styleRoot from "./OB6EditorView.scss"
import { WamParameterDataMap } from "@webaudiomodules/api";
import { OB6Kernel } from "./OB6Kernel";
import { MIDIControllerNode } from "../../shared/midi/MIDIControllerNode";

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

type HTMLInputEvent = Event & {target: HTMLInputElement }

interface OB6EditorViewProps {
    plugin: MIDIControllerNode
}

export class OB6EditorView extends Component<OB6EditorViewProps, any> {
    kernel: OB6Kernel

    constructor() {
        super()
        this.kernel = new OB6Kernel()
    }

    valueChanged(id: string, value: number) {
        this.props.plugin.pause = true

        this.props.plugin.state[id].value = value

        let update: WamParameterDataMap = {}
        update[id] = this.props.plugin.state[id]

        this.props.plugin.setParameterValues(update)
        this.props.plugin.pause = false
    }

    getValue(id: string) {
        if (this.props.plugin.state && this.props.plugin.state[id]) {
            let entry = this.props.plugin.state[id]
            if (entry.value !== undefined) {
                return entry.value
            }
        }

        return this.kernel.parameters[id].toWAM().defaultValue
    }

    renderParam(id: string, labelOverride?: string) {
        if (!this.kernel.parameters[id]) {
            console.error("Error: invalid id ", id)
        }

        const info = this.kernel.parameters[id].toWAM()
        const label = labelOverride || info.label || id

        switch(info.type) {
            case "float":
                return <Knob onChange={(v) => this.valueChanged(id, v)} 
                             minimumValue={info.minValue} 
                             maximumValue={info.maxValue}
                             value={() => this.getValue(id)}
                             label={label}
                             bipolar={info.minValue < 0}
                             >
                        </Knob>
            case "int":
                return <Knob onChange={(v) => this.valueChanged(id, Math.round(v))} 
                             minimumValue={info.minValue} 
                             maximumValue={info.maxValue}
                             value={() => this.getValue(id)}
                             label={label}
                             bipolar={info.minValue < 0}
                             integer={true}
                             >
                        </Knob>
            case "boolean":
                return <Select onChange={(v) => this.valueChanged(id, parseInt(v))}
                               options={["off", "on"]}
                               value={() => this.getValue(id)}
                               label={label}
                    >
                </Select>
            case "choice":
                return <Select onChange={(v) => this.valueChanged(id, parseInt(v))}
                                options={info.choices}
                                value={() => this.getValue(id)}
                                label={label}
                    >
                </Select>  
            default:
                return <div>unknown!</div>
        }
    }

    renderOsc1() {
        return <div class={styles.group}>
                    <div class={styles.column}>
                        <div class={styles.row}>
                            Osc 1
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("osc1_freq", "Freq")}
                            {this.renderParam("osc1_shape", "Shape")}
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("osc1_pw", "Pulse Width")}
                            {this.renderParam("osc1_sync", "Sync")}
                        </div>
                    </div>
        </div>
    }

    renderOsc2() {
        return <div class={styles.group}>
                    <div class={styles.column}>
                        <div class={styles.row}>
                            Osc 2
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("osc2_freq", "Freq")}
                            <Knob onChange={(v) => this.valueChanged("osc2_detune", Math.round(v)+127)} 
                             minimumValue={-127}
                             maximumValue={127}
                             value={() => this.getValue("osc2_detune") - 126}
                             label={"Detune"}
                             bipolar={true}
                             integer={true}
                             >
                    </Knob>
                            {this.renderParam("osc2_lo_freq", "Lo Freq")}
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("osc2_shape", "Shape")}
                            {this.renderParam("osc2_pw", "Pulse Width")}
                            {this.renderParam("osc2_key_track", "Keyboard")}
                        </div>
                    </div>
        </div>
    }

    renderOscMod() {
        return <div class={styles.group}>
        <div class={styles.column}>
                <div class={styles.row}>
                    <Knob onChange={(v) => this.valueChanged("xmod_filter_env", Math.round(v)+127)} 
                             minimumValue={-127}
                             maximumValue={127}
                             value={() => this.getValue("xmod_filter_env") - 126}
                             label={"XMod Filter Env"}
                             bipolar={true}
                             integer={true}
                             >
                    </Knob>
                    <Knob onChange={(v) => this.valueChanged("xmod_osc2", Math.round(v)+127)} 
                            minimumValue={-127}
                            maximumValue={127}
                            value={() => this.getValue("xmod_osc2") - 126}
                            label={"XMod Osc 2"}
                            bipolar={true}
                            integer={true}
                            >
                    </Knob>
                </div>
                <div class={styles.row}>
                    {this.renderParam("xmod_freq1", "Freq 1")}            
                    {this.renderParam("xmod_shape1", "Shape 1")}
                </div>
                <div class={styles.row}>
                    {this.renderParam("xmod_pw1", "PW 1")}
                    {this.renderParam("xmod_filter", "Filter")}
                </div>
                <div class={styles.row}>
                    {this.renderParam("xmod_mode", "Filter Mode")}
                    {this.renderParam("xmod_bp", "Filter BP")}
                </div>
            </div>
        </div>
    }

    renderAftertouch() {
        return <div class={styles.group}>
            <div class={styles.column}>
                <div class={styles.row}>
                    <Knob onChange={(v) => this.valueChanged("pressure_amt", Math.round(v)+127)} 
                             minimumValue={-127}
                             maximumValue={127}
                             value={() => this.getValue("pressure_amt") - 126}
                             label={"Pressure Amt"}
                             bipolar={true}
                             integer={true}
                             >
                        </Knob>
                </div>
                <div class={styles.row}>
                    {this.renderParam("pressure_freq1", "Freq 1")}
                    {this.renderParam("pressure_freq2", "Freq 2")}
                </div>
                <div class={styles.row}>
                    {this.renderParam("pressure_filter", "Filter")}
                    {this.renderParam("pressure_mode", "Filter mode")}
                </div>
                <div class={styles.row}>
                    {this.renderParam("pressure_vca", "VCA")}
                    {this.renderParam("pressure_lfo", "LFO")}
                </div>
            </div>
        </div>
    }

    renderLFO() {
        return <div class={styles.group}>
        <div class={styles.column}>
            <div class={styles.row}>
                LFO
            </div>
            <div class={styles.row}>
                {this.renderParam("lfo_freq", "Frequency")}
                {this.renderParam("lfo_amount", "Initial")}
            </div>
            <div class={styles.row}>
                {this.renderParam("lfo_shape", "Shape")}
                {this.renderParam("lfo_sync", "Sync")}
            </div>
            <div class={styles.row}>
                {this.renderParam("lfo_freq1", "Freq 1")}
                {this.renderParam("lfo_freq2", "Freq 2")}
                {this.renderParam("lfo_pw", "PW")}
            </div>
            <div class={styles.row}>
                {this.renderParam("lfo_amp", "Amp")}
                {this.renderParam("lfo_filter", "Filter")}
                {this.renderParam("lfo_mode", "Filter Mode")}
            </div>
            </div>
        </div>
    }

    renderMixer() {
        return <div class={styles.group}>
                    <div class={styles.column}>
                        <div class={styles.row}>
                            Mixer
                        </div>
                        <div style="flex: 1;"></div>
                        <div class={styles.row}>
                            {this.renderParam("mixer_osc1")}
                            {this.renderParam("mixer_osc2")}
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("mixer_sub")}
                            {this.renderParam("mixer_noise")}
                        </div>
                    </div>
        </div>
    }

    renderFilter() {
        return <div class={styles.group}>
                    <div class={styles.column}>
                        <div class={styles.row}>
                            Filter
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("filter_freq", "Freq")}
                            {this.renderParam("filter_res", "Res")}
                            {this.renderParam("filter_mode", "Mode")}
                        </div>
                        <div class={styles.row}>
                            {this.renderParam("filter_bp", "BP")}
                            {this.renderParam("filter_key", "Keyboard")}
                            {this.renderParam("filter_vel", "Velocity")}
                        </div>
                    </div>
        </div>
    }

    renderEnv() {
        return <div class={styles.group}>
            <div class={styles.column}>
                <div class={styles.row}>
                    Amp Env
                </div>
                <div class={styles.row}>
                    {this.renderParam("env_attack", "Attack")}
                    {this.renderParam("env_decay", "Decay")}
                    {this.renderParam("env_sustain", "Sustain")}
                    {this.renderParam("env_release", "Release")}
                    {this.renderParam("env_amount", "Amount")}
                    {this.renderParam("env_velocity", "Velocity")}
                </div>
            </div>
        </div>
    }

    renderFilterEnv() {
        return <div class={styles.group}>
            <div class={styles.column}>
                <div class={styles.row}>
                    Filter Env
                </div>
                <div class={styles.row}>
                    {this.renderParam("fenv_attack", "Attack")}
                    {this.renderParam("fenv_decay", "Decay")}
                    {this.renderParam("fenv_sustain", "Sustain")}
                    {this.renderParam("fenv_release", "Release")}
                    <Knob onChange={(v) => this.valueChanged("fenv_amount", Math.round(v)+63)} 
                             minimumValue={-63}
                             maximumValue={64}
                             value={() => this.getValue("fenv_amount") - 63}
                             label={"Amount"}
                             bipolar={true}
                             integer={true}
                             >
                        </Knob>
                </div>
            </div>
        </div>
    }

    renderAmp() {
        return <div class={styles.group}>
            {this.renderParam("volume")}
            {this.renderParam("distortion")}
            {this.renderParam("pan_spread")}
            {this.renderParam("unison")}
            {this.renderParam("pb_range")}
        </div>
    }

    renderArp() {
        return <div class={styles.group}>
            {this.renderParam("arp")}
            {this.renderParam("arp_mode")}
            {this.renderParam("arp_octave")}
            {this.renderParam("arp_time_sig")}
            {this.renderParam("bpm")}

        </div>
    }

    renderFX() {
        return <div class={styles.group}>
            {this.renderParam("fx_enable")}
            {this.renderParam("fx1_type")}
            {this.renderParam("fx1_mix")}
            {this.renderParam("fx1_param1")}
            {this.renderParam("fx1_param2")}
            {this.renderParam("fx1_sync")}
            {this.renderParam("fx2_type")}
            {this.renderParam("fx2_mix")}
            {this.renderParam("fx2_param1")}
            {this.renderParam("fx2_param2")}
            {this.renderParam("fx2_sync")}
        </div>
    }

    async initPressed() {
        await this.props.plugin.initPressed()
    }

    allNotesOff() { 
        this.props.plugin.sendEventToProcessor({
            type: "wam-midi",
            data: {
                bytes: [0xb0, 0x78, 0]
            }
        })
    }

    channelChanged(ev: any) {
        this.props.plugin.updateConfig({channel: parseInt(ev.target!.value)})
    }

    renderHeader() {
        let channels = []
        for (let i = 0; i < 16; i++) {
            channels.push(<option value={i} selected={i == this.props.plugin.config.channel}>{i+1}</option>)
        }

        let channelSelector = <select onChange={(ev) => this.channelChanged(ev)}>
            {channels}
        </select>

        return <div class={styles.header}>
                    <div class={styles.container} style="padding: 10px">
                        <span>Channel: {channelSelector}</span>
                        <button onClick={() => this.initPressed()}>Init Patch</button>
                        <button onClick={() => this.allNotesOff()}>All Notes Off</button>
                    </div>
            </div>
    }

    render() {
        return <div class={[styles.column, styles.plugin].join(" ")}>
            {this.renderHeader()}
            {this.renderPage()}
        </div>
    }

    renderPage() {
        return <div class={styles.column}>
                 <div class={styles.container}>
                    <div class={styles.container} id="modulation">
                        {this.renderAftertouch()}
                        {this.renderOscMod()}
                        {this.renderLFO()}
                    </div>
                    <div class={styles.container}>
                        {this.renderOsc1()}
                        {this.renderOsc2()}
                        {this.renderMixer()}
                        {this.renderFilter()}
                    </div>
                </div>
                <div class={styles.container}>
                    <div class={styles.row}>
                        {this.renderEnv()}
                        {this.renderFilterEnv()}
                        {this.renderAmp()}
                    </div>
                </div>
                <div class={styles.container}>
                    <div class={styles.row}>
                        {this.renderArp()}
                        {this.renderFX()}
                    </div>
                </div>
            </div>
    }
}