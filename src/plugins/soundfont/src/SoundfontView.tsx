import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import Soundfont from '.';

export interface SoundfontViewProps {
  plugin: Soundfont
}

export class SoundfontView extends Component<SoundfontViewProps, any> {
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
    <div class="soundfont-module">
        <div style="display: flex">
            soundfont ui here

            <div style="flex: 1">
            </div>
        </div>
        <style>
          {this.css()}
        </style>
    </div>)
  }

  css(): string {
    return `
      .soundfont-module {
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