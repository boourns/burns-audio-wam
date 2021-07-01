import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import Delay from '.'

export interface DelayViewProps {
  plugin: Delay
}

export class DelayView extends Component<DelayViewProps, any> {
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
    <div class="delay-module">
    <div style="display: flex">
        <Knob label="Time" size={40} value={() => params.getParamValue("time")} minimumValue={0.001} maximumValue={5} onChange={(v) => this.paramChanged("time", v)}/>
        <Knob label="Fdbk" size={40} value={() => params.getParamValue("feedback")} minimumValue={0} maximumValue={1.2} onChange={(v) => this.paramChanged("feedback", v)}/>
        <Knob label="Wet" size={40} value={() => params.getParamValue("wet")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("wet", v)}/>
    </div>
    <div style="display: flex">
        <Knob label="Base" size={40} value={() => params.getParamValue("highpass")} minimumValue={0} maximumValue={10000} onChange={(v) => this.paramChanged("highpass", v)}/>
        <Knob label="Width" size={40} value={() => params.getParamValue("lowpass")} minimumValue={0} maximumValue={10000} onChange={(v) => this.paramChanged("lowpass", v)}/>
        <Knob label="Stereo" size={40} value={() => params.getParamValue("stereo")} minimumValue={0.001} maximumValue={5} onChange={(v) => this.paramChanged("stereo", v)}/>
    </div>
    <div style="flex: 1">
        <Select label="Ping/Pong" options={["off", "on"]} values={[0, 1]} value={() => params.getParamValue("pingpong")} onChange={(v) => this.paramChanged("pingpong", v)}/>
    </div>
    <style>
      {this.css()}
    </style>
</div>)
  }

  css(): string {
    return `
    .delay-module {
      flex: 1;
      background-color: darkslateblue;
      display: flex;
      flex-direction:column;
      justify-content:space-between;
      color: white;
      padding: 10px;
  }
  
  .delay-module .component-wrapper {
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