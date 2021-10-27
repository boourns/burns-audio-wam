import { Component, h } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import SpectrumModalModule from '.';
import { Select } from '../../shared/ui/Select'

export interface SpectrumModalViewProps {
  plugin: SpectrumModalModule
}

const models = ["Modal", "Non-linear", "Chords", "Ominous"]

export class SpectrumModalView extends Component<SpectrumModalViewProps, any> {
  statePoller: number

  constructor() {
    super();
    this.pollState = this.pollState.bind(this)
    this.state = {
    }
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.pollState()
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    window.cancelAnimationFrame(this.statePoller)
  }

  paramChanged(param: string, value: any) {
    this.state[param].value = value
    this.props.plugin.audioNode.setParameterValues(this.state) 
  }

  async pollState() {
    this.state = await this.props.plugin.audioNode.getParameterValues(false)

    this.statePoller = window.requestAnimationFrame(this.pollState)
  }

  render() {
    h("div", {})

    return (
    <div class="modal-module">
      <div style="display: flex; flex-direction: row; justify-content: stretch">
        <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1">
          <div style="display: flex">
              {this.knob("Contour", "exciterEnvShape")}
              {this.knob("Bow", "exciterBowLevel")}
              {this.knob("Blow", "exciterBlowLevel")}
              {this.knob("Strike", "exciterStrikeLevel")}
          </div>
          <div style="display: flex; padding-top: 10px;">
            {this.knob("Flow", "exciterBlowMeta")}
            {this.knob("Mallet", "exciterStrikeMeta")}
          </div>
          <div style="display: flex; padding-top: 10px;">
            {this.knob("Bow Timbre", "exciterBowTimbre")}
            {this.knob("Blow Timbre", "exciterBlowTimbre")}
            {this.knob("Strike Timber", "exciterStrikeTimbre")}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
          <div style="display: flex">
            <Select label="Model" options={models} value={() => this.state["resonatorModel"] ? this.state["resonatorModel"].value : 0.0} onChange={(e) => this.paramChanged("resonatorModel", parseInt(e))} />
          </div>
          <div style="display: flex">
            {this.knob("Geometry", "resonatorGeometry")}
            {this.knob("Brightness", "resonatorBrightness")}
          </div>
          <div style="display: flex">
            {this.knob("Damping", "resonatorDamping")}
            {this.knob("Position", "resonatorPosition")}
            {this.knob("Space", "space", 2.0)}
          </div>
        </div>
      </div>
        

      <div style="flex: 1">
      </div>
        <style>
          {this.css()}
        </style>
    </div>)
  }

  knob(label: string, param: string, maxValue: number = 1.0) {
    return <Knob label={label} value={() => this.state[param] ? this.state[param].value : 0.0 } minimumValue={0.0} maximumValue={maxValue} valueString={(v) => v.toFixed(2)} onChange={(v) => this.paramChanged(param, v)}  />

  }

  css(): string {
    return `

        /* UI elements */
      .modal-module {
          flex: 1;
          background-color: #476C9B;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px;
          color: white;
      }

      .component-wrapper {
        display: flex;
        flex-direction: column; 
        align-content: center; 
        text-align: center;
        flex: 1;
        padding-left: 3px;
        padding-right: 3px;
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