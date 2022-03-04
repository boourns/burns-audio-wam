import { Component, h } from 'preact';

import {debug} from "debug"
import AudioRecorderModule from '.';
import { WaveformView } from './WaveformView';

var logger = debug("plugin:chorder:view")

export interface AudioRecorderViewProps {
  plugin: AudioRecorderModule
}

type AudioRecorderViewState = {
  recording: boolean
}

export class AudioRecorderView extends Component<AudioRecorderViewProps, any> {
  statePoller: number

  constructor() {
    super();
  }

  toggleRecording() {
    let recording = !this.state.recording

    console.log("Recording: ", recording)
    this.props.plugin.audioNode.setRecording(recording)

    this.setState({recording})
  }

  render() {
    h("div", {})

    let waveform
    console.log("In render, audioBuffer ", this.props.plugin.audioNode.audioBuffer)
    if (this.props.plugin.audioNode.audioBuffer) {
      waveform = <WaveformView context={this.props.plugin.audioContext as AudioContext} audioBuffer={this.props.plugin.audioNode.audioBuffer}></WaveformView>
    }

    return (
    <div>
        <button onClick={(e) => this.toggleRecording()}>{this.state.recording ? "Stop Recording" : "Start Recording"}</button>
        {waveform}
    </div>)
  }

  css(): string {
    return `
      `
  }
  
}