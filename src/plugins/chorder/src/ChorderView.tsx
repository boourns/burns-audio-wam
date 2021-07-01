import { Component, h } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import ChorderModule from '.';

import {debug} from "debug"

var logger = debug("plugin:chorder:view")

export interface ChorderViewProps {
  plugin: ChorderModule
}

type ChorderParams = {
  offsets: number[]
}

export class ChorderView extends Component<ChorderViewProps, any> {
  statePoller: number

  constructor() {
    super();
    this.pollState = this.pollState.bind(this)
    this.state = {
      "offset1" : {value: 0},
      "offset2" : {value: 0},
      "offset3" : {value: 0},
      "offset4" : {value: 0},
      "offset5" : {value: 0},
      "offset6" : {value: 0},
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
    this.state[param].value = Math.round(value)
    this.props.plugin.audioNode.setParameterValues(this.state) 
  }

  async pollState() {
    this.state = await this.props.plugin.audioNode.getParameterValues(false)

    this.statePoller = window.requestAnimationFrame(this.pollState)
  }

  render() {
    h("div", {})

    return (
    <div class="lfo-module">
        <div style="display: flex">
            <Knob label="Offset 1" size={60} value={() => this.state["offset1"].value} minimumValue={-24} maximumValue={24} integer={true} bipolar={true} valueString={(v) => v.toFixed(0)} onChange={(v) => this.paramChanged("offset1", v)}  />
            <Knob label="Offset 2" size={60} value={() => this.state["offset2"].value} minimumValue={-24} maximumValue={24} integer={true} bipolar={true} valueString={(v) => v.toFixed(0)} onChange={(v) => this.paramChanged("offset2", v)} />
            <Knob label="Offset 3" size={60} value={() => this.state["offset3"].value} minimumValue={-24} maximumValue={24} integer={true} bipolar={true} valueString={(v) => v.toFixed(0)} onChange={(v) => this.paramChanged("offset3", v)} />
        </div>
        <div style="display: flex; padding-top: 10px;">
          <Knob label="Offset 4" size={60} value={() => this.state["offset4"].value} minimumValue={-24} maximumValue={24} integer={true} bipolar={true} valueString={(v) => v.toFixed(0)} onChange={(v) => this.paramChanged("offset4", v)} />
          <Knob label="Offset 5" size={60} value={() => this.state["offset5"].value} minimumValue={-24} maximumValue={24} integer={true} bipolar={true} valueString={(v) => v.toFixed(0)} onChange={(v) => this.paramChanged("offset5", v)} />
          <Knob label="Offset 6" size={60} value={() => this.state["offset6"].value} minimumValue={-24} maximumValue={24} integer={true} bipolar={true} valueString={(v) => v.toFixed(0)} onChange={(v) => this.paramChanged("offset6", v)} />
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