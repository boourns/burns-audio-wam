import { Component, h } from 'preact';

import {debug} from "debug"
import AudioRecorderModule from '.';
import { SampleView } from './SampleView';

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

    let samples: h.JSX.Element[] = this.props.plugin.audioNode.editor.samples.reverse().map(s => {
      return <SampleView context={this.props.plugin.audioContext as AudioContext} sample={s}></SampleView>
    })

    return (
    <div>
        <button onClick={(e) => this.toggleRecording()}>{this.state.recording ? "Stop Recording" : "Start Recording"}</button>
        {samples}
    </div>)
  }

  css(): string {
    return `
      `
  }
  
}