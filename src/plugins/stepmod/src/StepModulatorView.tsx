import { Component, h } from 'preact';
import { Fader } from '../../shared/ui/Fader'
import { Select } from '../../shared/ui/Select'
import { Knob } from '../../shared/ui/Knob'
import {debug} from "debug"
import StepModulatorModule from '.';
import { StepModulator } from './StepModulator';

var logger = debug("plugin:stepModulator:view")

let quantizeOptions = [
    "1/32",
    "1/16",
    "1/8",
    "1/4",
    "1/2",
    "1 bar",
    "2 bar",
    "4 bar",
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
]

export type StepModulatorViewProps = {
    plugin: StepModulatorModule
    sequencer: StepModulator
    clipId: string
}

type StepModulatorViewState = {
    showSettingsModal: boolean
}

export class StepModulatorView extends Component<StepModulatorViewProps, StepModulatorViewState> {
    constructor() {
        super();
    }

    componentDidMount() {
        this.props.sequencer.renderCallback = () => {
            this.forceUpdate()
        }
    }

    componentWillUnmount() {
        this.props.sequencer.renderCallback = undefined
    }

    paramChanged(name: string, value: number) {
        this.props.plugin.audioNode.paramMgr.parameters.get(name).setValueAtTime(value, 0)
    }

    getValue(name: string): number {
        let params = this.props.plugin.audioNode.paramMgr.parameters

        if (params.get(name) === undefined || params.get(name).value === undefined) {
            return 0
        } else {
            return params.get(name).value
        }
    }

    targetValueString(v: number): string {
        
        let param = this.props.plugin.targetParam

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

    render() {
        h("div", {})
        
        let clip = this.props.sequencer.getClip(this.props.clipId)
        let steps = clip.state.steps.map((step, index) => {
            return <Fader value={() => clip.state.steps[index]} valueString={v => this.targetValueString(v)} onChange={(e) => {clip.state.steps[index] = e; clip.updateProcessor(clip)}}/>
        })

        return (
        <div class="step-modulator-module">
            <div style="display: flex">
                {steps}
            </div>

            <div style="display: flex">
                <Knob label="Gain" size={40} value={() => this.getValue("gain")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("gain", v)}/>
                <Knob label="Slew" size={40} value={() => this.getValue("slew")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("slew", v)}/>
                <Select label="Speed" options={quantizeOptions} values={quantizeValues} value={() => clip.state.speed} onChange={(e) => { clip.state.speed = parseInt(e); clip.updateProcessor(clip)}} />
            </div>

            <div style="flex: 1"></div>
            <style>
            {this.css()}
            </style>
        </div>)
    }

  css(): string {
    return `
      .step-modulator-module {
          flex: 1;
          background-color: #56585b;
          display: flex;
          flex-direction:column;
          justify-content:space-between;
          padding: 10px;
          color: white;
      }
      
      .step-modulator-module .component-wrapper {
          padding: 5px;
      }

        /* UI elements */
    
      .component-wrapper {
        display: flex;
        flex-direction: column; 
        align-content: center; 
        text-align: center;
        flex: 1;
      }
      
      .component-knob, .component-fader {
          margin-top: auto;
      }
      
      .component-select {
          margin-top: auto;
          margin-bottom: 3px;
      }
      `
  }
  
}