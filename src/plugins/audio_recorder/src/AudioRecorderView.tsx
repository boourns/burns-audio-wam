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

    let waveforms: h.JSX.Element[] = this.props.plugin.audioNode.samples.reverse().map(s => {
      return  <WaveformView context={this.props.plugin.audioContext as AudioContext} audioBuffer={s.buffer}></WaveformView>
    })

    return (
    <div>
        <button onClick={(e) => this.toggleRecording()}>{this.state.recording ? "Stop Recording" : "Start Recording"}</button>
        {waveforms}
    </div>)
  }

  css(): string {
    return `
      `
  }
  
}