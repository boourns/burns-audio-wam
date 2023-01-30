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
            {this.renderParam("dco1_octave")}
            {this.renderParam("dco1_wave")}
            {this.renderParam("dco1_lfo")}
            {this.renderParam("dco1_env")}
        </div>
    }

    renderOsc2() {
        return <div class={styles.group}>
            {this.renderParam("dco2_octave")}
            {this.renderParam("dco2_wave")}
            {this.renderParam("dco2_tune")}
            {this.renderParam("dco2_fine")}

            {this.renderParam("dco2_lfo")}
            {this.renderParam("dco2_env")}
        </div>
    }

    renderOscMod() {
        return <div class={styles.group}>
            {this.renderParam("osc_lfo")}
            {this.renderParam("osc_env")}
            {this.renderParam("osc_env_polarity")}
        </div>
    }

    renderLFO() {
        return <div class={styles.group}>
            {this.renderParam("lfo_wave")}
            {this.renderParam("lfo_delay")}
            {this.renderParam("lfo_rate")}
        </div>
    }

    renderMixer() {
        return <div class={styles.group}>
            {this.renderParam("mix")}
            {this.renderParam("hpf")}
        </div>
    }

    renderFilter() {
        return <div class={styles.group}>
            {this.renderParam("cutoff")}
            {this.renderParam("res")}
            {this.renderParam("filter_lfo")}
            {this.renderParam("filter_env")}
            {this.renderParam("filter_env_polarity")}
            {this.renderParam("filter_pitch")}
        </div>
    }

    renderEnv() {
        return <div class={styles.group}>
            {this.renderParam("env_attack")}
            {this.renderParam("env_decay")}
            {this.renderParam("env_sustain")}
            {this.renderParam("env_release")}
        </div>
    }

    renderAmp() {
        return <div class={styles.group}>
            {this.renderParam("level")}
            {this.renderParam("chorus")}
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
                    <div class={styles.column}>
                        {this.renderOsc1()}
                        {this.renderOsc2()}
                        {this.renderOscMod()}
                        {this.renderLFO()}

                    </div>
                    <div class={styles.column}>
                        {this.renderMixer()}
                        {this.renderFilter()}
                        {this.renderEnv()}
                        {this.renderAmp()}
                    </div>
                  </div>
                </div>
    }
}