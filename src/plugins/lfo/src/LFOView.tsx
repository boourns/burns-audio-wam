import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import LFO from '.'

export interface LFOViewProps {
  plugin: LFO
}

export class LFOView extends Component<LFOViewProps, any> {
  constructor() {
    super();
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
  }

  paramChanged(param: string, value: any) {
    this.props.plugin.audioNode.paramMgr.setParamValue(param, value)
  }

  render() {
    h("div", {})

    let params = this.props.plugin.audioNode.paramMgr

    return (
    <div class="lfo-module">
        <div style="display: flex">
            <Knob label="Frequency" size={40} value={() => params.getParamValue("frequency")} minimumValue={0.001} maximumValue={40} onChange={(v) => this.paramChanged("frequency", v)}/>
            <Knob label="Gain" size={40} value={() => params.getParamValue("gain")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("gain", v)}/>

        </div>

        <div style="flex: 1">
        </div>
        <style>
          {this.css()}
        </style>
    </div>)
  }

  css(): string {
    return `
      .lfo-module {
          flex: 1;
          background-color: #lightblue;
          display: flex;
          flex-direction:column;
          justify-content:space-between;
          padding: 10px;
          color: white;
      }
      
      .distortion-module .component-wrapper {
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