import { Component, h } from 'preact';
import AudioRecorderModule from '.';
import { SampleView } from './SampleView';
import { WamAsset } from 'wam-extensions';
import { Sample } from './Sample';

export interface AudioRecorderViewProps {
  plugin: AudioRecorderModule
}

type AudioRecorderViewState = {
  recording: boolean
}

export class AudioRecorderView extends Component<AudioRecorderViewProps, AudioRecorderViewState> {
  statePoller: number

  constructor() {
    super();
  }

  componentDidMount() {
    this.props.plugin.audioNode.editor.callback = () => {
      this.forceUpdate()
    }
  }

  componentWillUnmount(): void {
      this.props.plugin.audioNode.editor.callback = undefined
  }

  toggleRecording() {
    let recording = !this.state.recording

    console.log("Recording: ", recording)
    this.props.plugin.audioNode.setRecording(recording)

    this.setState({recording})
  }

  loadAssets() {
    if (!window.WAMExtensions.assets) {
      console.error("Host must implement asset WAM extension")
      return
    }

    let editor = this.props.plugin.audioNode.editor
    let context = this.props.plugin.audioContext

    let backupState = editor.getState()
    
    window.WAMExtensions.assets.pickAsset(this.props.plugin.instanceId, "AUDIO", async (asset: WamAsset) => {
      console.log("in loadAssets callback")
      if (asset && asset.content) {
        let buffer = await asset.content.arrayBuffer()

        context.decodeAudioData(buffer, (buffer: AudioBuffer) => {
          let sample = new Sample(this.props.plugin.audioContext, buffer)

          let sampleState = editor.defaultSampleState(sample, asset.name)

          this.props.plugin.audioNode.editor.setState({samples: backupState.samples.concat(sampleState)})
        })
      } else {
        editor.setState(backupState)
      }

      this.forceUpdate()
    })
  }


  render() {
    h("div", {})

    let samples: h.JSX.Element[] = this.props.plugin.audioNode.editor.samples.map((s, i) => {
      return <SampleView index={i} editor={this.props.plugin.audioNode.editor} context={this.props.plugin.audioContext as AudioContext} sample={s}></SampleView>
    })

    return (
    <div style="overflow-y: scroll; height: 100%; ">
        <button onClick={(e) => this.toggleRecording()}>{this.state.recording ? "Stop Recording" : "Start Recording"}</button>
        <button onClick={(e) => this.loadAssets()}>Load</button>

        {samples.reverse()}
    </div>)
  }

  css(): string {
    return `
      `
  }
  
}