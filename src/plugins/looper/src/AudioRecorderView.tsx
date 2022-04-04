import { Component, h } from 'preact';
import AudioRecorderModule from '.';
import { SampleView } from './SampleView';
import { WamAsset } from 'wam-extensions';
import { Sample } from './Sample';

export interface AudioRecorderViewProps {
  plugin: AudioRecorderModule
}

type AudioRecorderViewState = {
}

export class AudioRecorderView extends Component<AudioRecorderViewProps, AudioRecorderViewState> {
  statePoller: number

  constructor() {
    super();
  }

  componentDidMount() {
    this.props.plugin.audioNode.editor.callback = () => {
      console.log("Forcing redraw")
      this.forceUpdate()
    }
  }

  componentWillUnmount(): void {
      this.props.plugin.audioNode.editor.callback = undefined
  }

  isRecording(): boolean {
    return this.props.plugin._audioNode.recordingArmed
  }

  toggleRecording() {
    let recording = !this.isRecording()

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

    console.log("Rendering")

    let samples: h.JSX.Element[] = this.props.plugin.audioNode.editor.samples.map((s, i) => {
      return <SampleView index={i} editor={this.props.plugin.audioNode.editor} context={this.props.plugin.audioContext as AudioContext} sample={s}></SampleView>
    })

    let result = (
    <div style="overflow-y: scroll; height: 100%; background-color: #190933; ">
        <button style="padding: 5px; border: 1px solid; border-radius: 5%; margin: 5px; font-weight: bold;" onClick={(e) => this.loadAssets()}>Load Track</button>
        <button style="padding: 5px; border: 1px solid; border-radius: 5%; margin: 5px; font-weight: bold;" onClick={(e) => this.toggleRecording()}>{this.isRecording() ? "🔴 Armed" : "⭕️ Not Armed"}</button>

        {samples.reverse()}
    </div>)

    console.log("done rendering")
    return result
  }

  css(): string {
    return `
      `
  }
  
}