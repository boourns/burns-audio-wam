import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'

import SimpleEQ from '.'

export interface SimpleEQProps {
  plugin: SimpleEQ
}

export class SimpleEQView extends Component<SimpleEQProps, any> {
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
      <div class="wrapper">
        <div class="simpleeq-module">
            <div class="simpleeq-group">
              <div class="simpleeq-group-header">Low</div>
              <div class="simpleeq-group-content">
                <Knob label="Freq" value={() => params.getParamValue("lowFrequency")} minimumValue={20} maximumValue={400} onChange={(v) => this.paramChanged("lowFrequency", v)}/>
                <Knob label="Gain" value={() => params.getParamValue("lowGain")} minimumValue={-40} maximumValue={40} bipolar={true} onChange={(v) => this.paramChanged("lowGain", v)}/>
              </div>
            </div>

            <div class="simpleeq-group">
              <div class="simpleeq-group-header">Med</div>
              <div class="simpleeq-group-content">
                <Knob label="Freq" value={() => params.getParamValue("mediumFrequency")} minimumValue={200} maximumValue={1000} onChange={(v) => this.paramChanged("mediumFrequency", v)}/>
                <Knob label="Gain" value={() => params.getParamValue("mediumGain")} minimumValue={-40} maximumValue={40} bipolar={true} onChange={(v) => this.paramChanged("mediumGain", v)}/>
              </div>
            </div>

            <div class="simpleeq-group">
            <div class="simpleeq-group-header">High</div>
              <div class="simpleeq-group-content">
                <Knob label="Freq" value={() => params.getParamValue("highFrequency")} minimumValue={6000} maximumValue={12000} onChange={(v) => this.paramChanged("highFrequency", v)}/>
                <Knob label="Gain" value={() => params.getParamValue("highGain")} minimumValue={-40} maximumValue={40} bipolar={true} onChange={(v) => this.paramChanged("highGain", v)}/>
              </div>
            </div>
          <style>
            {this.css()}
          </style>
        </div>
    </div>

    )
  }

  css(): string {
    return `
        .wrapper {
          display: flex;
          background-color: #2b3595;
        }

        .simpleeq-module {
            display: flex;
            flex-direction: row;
            flex: 1;
            color: white;
            margin-bottom: auto;
        }
        
        .simpleeq-module .component-wrapper {
            padding: 5px;
        }
        
        .simpleeq-group {
            border: 1px solid rgba(255,255,255,0.2);
            margin: 5px;
            display: flex;
            flex-direction: column;
        }
        
        .simpleeq-group-header {
            background-color: rgba(255,255,255,0.2);
            padding: 2px;
        }
        
        .simpleeq-group-content {
            display: flex;
            flex-direction: column;
            justify-content: stretch;
            flex: 1;
            padding: 10px 5px 10px 5px;
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