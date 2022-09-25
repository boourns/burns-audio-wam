import { Component, h } from "preact";
import {Knob} from "../../shared/ui/Knob"
import {Select} from "../../shared/ui/Select"

import styleRoot from "./MicrokorgEditorView.scss"
import { WamParameterDataMap } from "@webaudiomodules/api";
import { MicrokorgKernel } from "./MicrokorgKernel";
import { MIDIControllerNode } from "./MIDIControllerNode";
// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

interface MicrokorgEditorViewProps {
    plugin: MIDIControllerNode
}

type MicrokorgPages = 'timbre1' | 'timbre2' | 'patch'

type MicrokorgEditorViewState = {
    page: MicrokorgPages
}

export class MicrokorgEditorView extends Component<MicrokorgEditorViewProps, MicrokorgEditorViewState> {
    kernel: MicrokorgKernel

    constructor() {
        super()
        this.kernel = new MicrokorgKernel()
        this.state = {
            page: 'timbre1'
        }
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

    showPage(page: MicrokorgPages) {
        this.setState({page})
    }

    renderTimbreParam(timbre: number, id: string) {
        if (timbre == 2) {
            return this.renderParam(`t2_${id}`)
        }
        return this.renderParam(id)
    }

    renderParam(id: string) {
        const info = this.kernel.parameters[id].toWAM()

        switch(info.type) {
            case "float":
                return <Knob onChange={(v) => this.valueChanged(id, v)} 
                             minimumValue={info.minValue} 
                             maximumValue={info.maxValue}
                             value={() => this.getValue(id)}
                             label={info.label || id}
                             bipolar={info.minValue < 0}
                             >
                        </Knob>
            case "int":
                return <Knob onChange={(v) => this.valueChanged(id, Math.round(v))} 
                             minimumValue={info.minValue} 
                             maximumValue={info.maxValue}
                             value={() => this.getValue(id)}
                             label={info.label || id}
                             bipolar={info.minValue < 0}
                             integer={true}
                             >
                        </Knob>
            case "boolean":
                return <Select onChange={(v) => this.valueChanged(id, parseInt(v))}
                               options={["off", "on"]}
                               value={() => this.getValue(id)}
                               label={info.label || id}
                    >
                </Select>
            case "choice":
                return <Select onChange={(v) => this.valueChanged(id, parseInt(v))}
                                options={info.choices}
                                value={() => this.getValue(id)}
                                label={info.label || id}
                    >
                </Select>  
            default:
                return <div>unknown!</div>
        }
    }

    renderOsc1(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t, "osc1_wave")}
            {this.renderTimbreParam(t, "osc1_control1")}
            {this.renderTimbreParam(t, "osc1_control2")}
        </div>
    }

    renderOsc2(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t, "osc2_wave")}
            {this.renderTimbreParam(t,"osc2_tune")}
            {this.renderTimbreParam(t,"osc2_finetune")}
            {this.renderTimbreParam(t,"osc_mod")}
        </div>
    }

    renderMixer(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t,"mixer_osc1")}
            {this.renderTimbreParam(t,"mixer_osc2")}
            {this.renderTimbreParam(t,"mixer_noise")}
        </div>
    }

    renderFilter(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t,"filter_type")}
            {this.renderTimbreParam(t,"filter_cutoff")}
            {this.renderTimbreParam(t,"filter_res")}
            {this.renderTimbreParam(t,"filter_env")}
            {this.renderTimbreParam(t,"filter_keyboard")}
        </div>
    }

    renderFEG(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t,"f_eg_attack")}
            {this.renderTimbreParam(t,"f_eg_decay")}
            {this.renderTimbreParam(t,"f_eg_sustain")}
            {this.renderTimbreParam(t,"f_eg_release")}
        </div>
    }

    renderAmp(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t,"amp_level")}
            {this.renderTimbreParam(t,"amp_pan")}
            {this.renderTimbreParam(t,"amp_distortion")}
            {this.renderTimbreParam(t,"amp_keyboard")}

        </div>
    }

    renderAEG(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t,"amp_eg_attack")}
            {this.renderTimbreParam(t,"amp_eg_decay")}
            {this.renderTimbreParam(t,"amp_eg_sustain")}
            {this.renderTimbreParam(t,"amp_eg_release")}
        </div>
    }

    renderLFOs(t: number, n: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t,`lfo${n}_wave`)}
            {this.renderTimbreParam(t,`lfo${n}_freq`)}
            {this.renderTimbreParam(t,`lfo${n}_keysync`)}
            {this.renderTimbreParam(t,`lfo${n}_temposync`)}
            {this.renderTimbreParam(t,`lfo${n}_timebase`)}

        </div>
    }

    renderPatchbay(t: number, n: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t, `patch${n}_src`)}
            {this.renderTimbreParam(t, `patch${n}_dest`)}
            {this.renderTimbreParam(t, `patch${n}_level`)}
        </div>
    }

    renderFX() {
        return <div class={styles.group}>
            {this.renderParam('modfx_speed')}
            {this.renderParam('modfx_depth')}
            {this.renderParam('modfx_type')}
        </div>    
    }

    renderDelay() {
        return <div class={styles.group}>
            {this.renderParam('delay_time')}
            {this.renderParam('delay_depth')}
            {this.renderParam('delay_sync')}
            {this.renderParam('delay_sync_division')}
            {this.renderParam('delay_type')}
        </div>    
    }

    renderArp1() {
        return <div class={styles.group}>
            {this.renderParam('arp_enabled')}
            {this.renderParam('arp_steps')}
            {this.renderParam('arp_range')}
            {this.renderParam('arp_latch')}
            {this.renderParam('arp_type')}
            {this.renderParam('arp_gate')}
            
        </div>
    }

    renderArp2() {
        return <div class={styles.group}>
            {this.renderParam('arp_tempo')}
            {this.renderParam('arp_target')}
            {this.renderParam('arp_key_sync')}
            {this.renderParam('arp_resolution')}
            {this.renderParam('arp_swing')}
        </div>
    }

    renderArpSteps() {
        let steps = []
        for (let i = 1; i < 9; i++) {
            steps.push(this.renderParam(`arp_step_${i}`))
        }
        return <div class={styles.group}>
            {steps}
        </div>
    }

    async initPressed() {
        await this.props.plugin.initPressed()
    }

    detectMicrokorg() {
        const message = [
            0xF0,
            0x7E,
            0x7F,
            0x06,
            0x01,
            0xF7
        ]

        this.props.plugin.sendEventToProcessor({
            type: "wam-sysex",
            data: {
                bytes: new Uint8Array(message)
            }
        })
    }

    requestSysex() {
        const message = [
            0xF0,
            0x42,
            0x30, // needs to add on the current channel value
            0x58,
            0x10,
            0xF7
        ]

        this.props.plugin.sendEventToProcessor({
            type: "wam-sysex",
            data: {
                bytes: new Uint8Array(message)
            }
        })
    }
    
    allNotesOff() {
        this.props.plugin.sendEventToProcessor({
            type: "wam-midi",
            data: {
                bytes: [0xb0, 0x78, 0]
            }
        })
    }

    renderHeader() {
        let channels = []
        for (let i = 0; i < 16; i++) {
            channels.push(<option value={i}>{i+1}</option>)
        }

        let channelSelector = <select>
            {channels}
        </select>

        return <div class={styles.header}>

                    <div class={styles.container}>
                        {this.renderVoice()}
                        <button onClick={() => this.showPage('timbre1')}>Timbre 1</button>
                        <button onClick={() => this.showPage('timbre2')}>Timbre 2</button>
                        <button onClick={() => this.showPage('patch')}>Patch</button>
                    </div>

                    <div class={styles.container} style="padding: 10px">
                        <span>Channel: {channelSelector}</span>
                        <button onClick={() => this.detectMicrokorg()}>🔴 Connect</button>

                        <button onClick={() => this.initPressed()}>Init Patch</button>
                        <button onClick={() => this.requestSysex()}>Request Sysex</button>
                        <button onClick={() => this.requestSysex()}>Send Patch</button>
                        <button onClick={() => this.allNotesOff()}>All Notes Off</button>
                    </div>
            </div>
    }

    renderPage() {
        switch (this.state.page) {
            case 'timbre1':
                return this.renderTimbrePage(1)
            case 'timbre2':
                return this.renderTimbrePage(2)
            case 'patch':
                return this.renderPatchPage()
        }
    }

    render() {
        return <div class={styles.column}>
            {this.renderHeader()}
            {this.renderPage()}
        </div>
    }

    renderPatchPage() {
        return <div class={styles.column}> 
            <div class={styles.container}>
                <div class={styles.column}>
                    <div class={styles.container}>
                    </div>
                    <div class={styles.container}>
                        {this.renderTimbreSettings(1)}
                    </div>
                    <div class={styles.container}>
                        {this.renderTimbreSettings(2)}
                    </div>
                    <div class={styles.container}>
                        {this.renderFX()}
                    </div>
                    <div class={styles.container}>
                        {this.renderEQ()}
                    </div>
                </div>
                <div class={styles.column}>
                    <div class={styles.container}>
                        {this.renderDelay()}
                    </div>
                    <div class={styles.container}>
                        {this.renderArp1()}
                    </div>
                    <div class={styles.container}>
                        {this.renderArp2()}
                    </div>
                    <div class={styles.container}>
                        {this.renderArpSteps()}
                    </div>
                </div>
            </div>
            {this.renderVocoder()}
        </div>

    }

    renderEQ() {
        return <div class={styles.column}>
            <div class={styles.container}>
                {this.renderParam('eq_hi_freq')}
                {this.renderParam('eq_hi_gain')}
                {this.renderParam('eq_lo_freq')}
                {this.renderParam('eq_lo_gain')}
            </div>
        </div>
    }

    renderVoice() {
        return <div>{this.renderParam('voice_mode')}</div>
    }

    renderVoiceGroup(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t, "voice_assign")}
            {this.renderTimbreParam(t, "unison_detune")}
            {this.renderTimbreParam(t, "tune")}
            {this.renderTimbreParam(t, "transpose")}
            {this.renderTimbreParam(t, "vibrato")}
            {this.renderTimbreParam(t, "portamento")}
        </div>
    }

    renderTimbreSettings(t: number) {
        return <div class={styles.group}>
            {this.renderTimbreParam(t, "eg1_reset")}
            {this.renderTimbreParam(t, "eg2_reset")}
            {this.renderTimbreParam(t, "trig_mode")}
            {this.renderTimbreParam(t, "bend_range")}
        </div>
    }

    renderVocoder() {
        let el = []
        for (let i = 1; i < 9; i++) {
            el.push( <div style={styles.column}>
                {this.renderParam(`voc_ch${i}_pan`)}
                {this.renderParam(`voc_ch${i}_level`)}
            </div>)
        }
        return <div class={styles.group}>
           {el}
        </div>
    }

    renderTimbrePage(t: number) {
        return <div class={styles.column}>
                 <div class={styles.container}>
                    <div class={styles.column}>
                        {this.renderVoiceGroup(t)}

                        {this.renderOsc1(t)}
                        {this.renderOsc2(t)}
                        {this.renderLFOs(t, 1)}
                        {this.renderLFOs(t, 2)}
                    </div>
                    <div class={styles.column}>
                        {this.renderMixer(t)}
                        {this.renderFilter(t)}
                        {this.renderFEG(t)}
                        {this.renderAmp(t)}
                        {this.renderAEG(t)}
                    </div>
                  </div>
                  <div class={styles.container}>
                    <div class={styles.column}>
                        <div class={styles.container}>
                            {this.renderPatchbay(t, 1)}
                            {this.renderPatchbay(t, 2)}
                            {this.renderPatchbay(t, 3)}
                            {this.renderPatchbay(t, 4)}
                        </div>
                    </div>
                    
                  </div>
                </div>
    }
}