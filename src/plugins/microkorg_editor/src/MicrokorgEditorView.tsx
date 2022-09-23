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

export class MicrokorgEditorView extends Component<MicrokorgEditorViewProps, any> {
    kernel: MicrokorgKernel

    constructor() {
        super()
        this.kernel = new MicrokorgKernel()
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

    renderOsc1() {
        return <div class={styles.group}>
            {this.renderParam("osc1_wave")}
            {this.renderParam("osc1_control1")}
            {this.renderParam("osc1_control2")}
        </div>
    }

    renderOsc2() {
        return <div class={styles.group}>
            {this.renderParam("osc2_wave")}
            {this.renderParam("osc2_tune")}
            {this.renderParam("osc2_finetune")}
            {this.renderParam("osc_mod")}
        </div>
    }

    renderMixer() {
        return <div class={styles.group}>
            {this.renderParam("mixer_osc1")}
            {this.renderParam("mixer_osc2")}
            {this.renderParam("mixer_noise")}
        </div>
    }

    renderFilter() {
        return <div class={styles.group}>
            {this.renderParam("filter_type")}
            {this.renderParam("filter_cutoff")}
            {this.renderParam("filter_res")}
            {this.renderParam("filter_env")}
            {this.renderParam("filter_keyboard")}
        </div>
    }

    renderFEG() {
        return <div class={styles.group}>
            {this.renderParam("f_eg_attack")}
            {this.renderParam("f_eg_decay")}
            {this.renderParam("f_eg_sustain")}
            {this.renderParam("f_eg_release")}
        </div>
    }

    renderAmp() {
        return <div class={styles.group}>
            {this.renderParam("amp_level")}
            {this.renderParam("amp_pan")}
            {this.renderParam("amp_distortion")}
        </div>
    }

    renderAEG() {
        return <div class={styles.group}>
            {this.renderParam("amp_eg_attack")}
            {this.renderParam("amp_eg_decay")}
            {this.renderParam("amp_eg_sustain")}
            {this.renderParam("amp_eg_release")}
        </div>
    }

    renderLFOs() {
        return <div class={styles.group}>
            {this.renderParam("lfo1_wave")}
            {this.renderParam("lfo1_freq")}
            {this.renderParam("lfo2_wave")}
            {this.renderParam("lfo2_freq")}
        </div>
    }

    renderPatchbay(n: number) {
        return <div class={styles.group}>
            {this.renderParam(`patch${n}_src`)}
            {this.renderParam(`patch${n}_dest`)}
            {this.renderParam(`patch${n}_level`)}
        </div>
    }

    renderFX() {
        return <div class={styles.group}>
            {this.renderParam('delay_time')}
            {this.renderParam('delay_depth')}
            {this.renderParam('modfx_speed')}
            {this.renderParam('modfx_depth')}
</div>    }

    renderArp() {
        return <div class={styles.group}>
            {this.renderParam('arpeggiator')}
            {this.renderParam('arp_range')}
            {this.renderParam('arp_latch')}
            {this.renderParam('arp_type')}
            {this.renderParam('arp_gate')}

        </div>
    }

    async initPressed() {
        await this.props.plugin.initPressed()
    }

    requestSysex() {
        // TODO
    }

    renderHeader() {
        return <div class={styles.container} style="padding: 10px">
            <button onClick={() => this.initPressed()}>Init Patch</button>
            <button onClick={() => this.requestSysex()}>Request Sysex</button>
            <button onClick={() => this.requestSysex()}>Send Patch</button>
        </div>
    }

    render() {
        return <div class={styles.column}>
            {this.renderHeader()}
            {this.renderTimbrePage()}
        </div>
    }

    renderTimbrePage() {
        return <div class={styles.column}>
                 <div class={styles.container}>
                    <div class={styles.column}>
                        {this.renderOsc1()}
                        {this.renderOsc2()}
                        {this.renderMixer()}
                        {this.renderLFOs()}
                    </div>
                    <div class={styles.column}>
                        {this.renderFilter()}
                        {this.renderFEG()}
                        {this.renderAmp()}
                        {this.renderAEG()}
                    </div>
                  </div>
                  <div class={styles.container}>
                    <div class={styles.column}>
                        <div class={styles.container}>
                            {this.renderPatchbay(1)}
                            {this.renderPatchbay(2)}
                        </div>
                        <div class={styles.container}>
                            {this.renderPatchbay(3)}
                            {this.renderPatchbay(4)}
                        </div>
                    </div>
                    <div class={styles.column}>
                        <div class={styles.container}>
                            {this.renderFX()}
                        </div>
                        <div class={styles.container}>
                            {this.renderArp()}
                        </div>
                    </div>
                  </div>
                </div>
    }
}