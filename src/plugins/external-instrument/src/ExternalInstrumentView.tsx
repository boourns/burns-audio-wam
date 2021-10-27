import { Component, h } from 'preact';
import ExternalInstrumentModule from '.';

var logger = (...any: any) => {}
//const logger = console.log

export interface ExternalInstrumentViewProps {
  plugin: ExternalInstrumentModule
}

export class ExternalInstrumentView extends Component<ExternalInstrumentViewProps, any> {
  statePoller: number

  constructor() {
    super();
    this.pollState = this.pollState.bind(this)
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
    this.state[param].value = Math.round(value)
    this.props.plugin.audioNode.setParameterValues(this.state) 
  }

  async pollState() {
    this.state = await this.props.plugin.audioNode.getParameterValues(false)

    this.statePoller = window.requestAnimationFrame(this.pollState)
  }

  render() {
    h("div", {})

    let CCs = this.props.plugin

    return (
      <div>External Instrument

      </div>
    )
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