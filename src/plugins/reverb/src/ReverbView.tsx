import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import ConvolutionReverb from '.'

export interface ConvolutionReverbViewProps {
  plugin: ConvolutionReverb
}

export class ConvolutionReverbView extends Component<ConvolutionReverbViewProps, any> {
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
    <div class="reverb-module">
        <div style="display: flex">
            <Knob label="Time" size={40} value={() => params.getParamValue("time")} minimumValue={0.001} maximumValue={40} onChange={(v) => this.paramChanged("time", v)}/>
            <Knob label="Mix" size={40} value={() => params.getParamValue("wet")} minimumValue={0.0} maximumValue={1} onChange={(v) => this.paramChanged("wet", v)}/>

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
      .reverb-module {
          flex: 1;
          background-color: #631F87;
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