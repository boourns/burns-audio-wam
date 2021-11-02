import { Component, h } from 'preact';
import MIDIOutputModule from '.';
import {Select} from "../../shared/ui/Select"

var logger = (...any: any) => {}
//const logger = console.log

export interface MIDIOutputViewProps {
  plugin: MIDIOutputModule
}

export class MIDIOutputView extends Component<MIDIOutputViewProps, any> {
  channelIndexes = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
  midiChannels = ["Original", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"]

  constructor() {
    super();
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.props.plugin.audioNode.updateUI = () => {
      let midiAccess = this.props.plugin.audioNode.midiAccess
      this.forceUpdate()
    }
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    this.props.plugin.audioNode.updateUI = undefined
  }

  channelChanged(v: string) {
    console.log("Changing MIDI channel to ", v)
    this.props.plugin.audioNode.state.channel = parseInt(v)
  }

  deviceChanged(v: string) {
    console.log("Changing MIDI device to ", v)
    this.props.plugin.audioNode.state.deviceID = v
  }

  render() {
    h("div", {})

    let midi = this.props.plugin.audioNode.midiAccess
    if (!midi) {
      return <div>MIDI access must be granted</div>
    }

    let devices = Array.from(midi.outputs.keys())
    let names = devices.map(d => midi.outputs.get(d).name ?? d)

    if (devices.length == 0) {
      return <div>No MIDI Devices found</div>
    }

    console.log("Rendering names ", names)

    return (
      <div>
        <Select value={() => this.props.plugin.audioNode.state.deviceID ?? devices[0]} values={devices} options={names} onChange={(v) => this.deviceChanged(v)}></Select>
        <Select value={() => this.props.plugin.audioNode.state.channel} values={this.channelIndexes} options={this.midiChannels} onChange={(v) => this.channelChanged(v)}></Select>
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