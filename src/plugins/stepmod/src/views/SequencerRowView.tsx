import { Slider } from '../../../shared/ui/Slider'
import { Select } from '../../../shared/ui/Select'
import { Knob } from '../../../shared/ui/Knob'

import { Component, h } from "preact";
import { StepModulator } from "../StepModulator";
import { StepModulatorNode } from '..';
import { StepModulatorView } from './StepModulatorView';
import { Clip } from '../Clip';

let quantizeOptions = [
    "1/32",
    "1/16",
    "1/8",
    "1/4",
    "1/2",
    "1 bar",
    "2 bar",
    "4 bar",
    "Per Note"
]

let quantizeValues = [
    3,
    6,
    12,
    24,
    48,
    96,
    96*2,
    96*4,
    0
]

export interface SequencerRowViewProps {
    node: StepModulatorNode
    row: number
    sequencer: StepModulator
    parent: StepModulatorView
    clipId: string
}

export class SequencerRowView extends Component<SequencerRowViewProps, any> {
    targetValueString(v: number): string {
        let param = this.props.sequencer.targetParameter

        if (!param) {
            return v.toFixed(1)
        }

        switch(param.type) {
            case "float":
                return `${(param.minValue + ((param.maxValue - param.minValue)*v)).toFixed(2)}${param.units}`
            case "int":
                return `${Math.round(param.minValue + ((param.maxValue - param.minValue)*v))}${param.units}`
            case "choice":
                let index = Math.round(v)
                return (index >=0 && index < param.choices.length) ? param.choices[index] : "?"
            case "boolean":
                return (Math.round(v) == 0) ? "false" : "true"
        } 
    }

    getValue(param: string): number {
        const id = `row${this.props.row+1}-${param}`
        
        return this.props.parent.paramState[id] ? this.props.parent.paramState[id].value : 0
    }

    async targetChanged(v: string) {
        await this.props.sequencer.setTargetParameter(v)
    }

    paramChanged(name: string, value: number) {
        this.props.parent.paramChanged(`row${this.props.row+1}-${name}`, value)
    }

    stepColor(clip: Clip, step: number) {        
        if (this.props.node.activeSteps[this.props.row] == step) {
            return "blue"
        } else {
            return "yellow"
        }
    }

    render() {
        let clip = this.props.sequencer.getClip(this.props.clipId)
        let steps = clip.state.steps.map((step, index) => {
            return <Slider color={() => this.stepColor(clip, index)} value={() => clip.state.steps[index]} valueString={v => this.targetValueString(v)} onChange={(e) => {clip.state.steps[index] = e; clip.updateProcessor(clip)}}/>
        })

        let paramNames: string[] = ["--"]
        let paramIds: string[] = ["disabled"]

        if (this.props.node.paramList) {
            paramNames.push(...Object.keys(this.props.node.paramList))
            paramIds.push(...Object.keys(this.props.node.paramList))
        }

        return <div style="display: flex; flex-direction: row">
            <div style="display: flex; width: 240px; flex-direction: column">
                <Select label="Param" options={paramNames} values={paramIds} value={() => this.props.sequencer.targetId} onChange={(v) => this.targetChanged(v)}/>
                <div style="display: flex; flex-direction: row">
                    <Knob label="Gain" size={40} value={() => this.getValue("gain")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("gain", v)}/>
                    <Knob label="Slew" size={40} value={() => this.getValue("slew")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("slew", v)}/>
                    <Select label="Speed" options={quantizeOptions} values={quantizeValues} value={() => clip.state.speed} onChange={(e) => { clip.state.speed = parseInt(e); clip.updateProcessor(clip)}} />
                </div>
               </div>

            <div style="display: flex; justify-content: space-between; width: 100%;">
                {steps}
            </div>
        </div>
    }
}