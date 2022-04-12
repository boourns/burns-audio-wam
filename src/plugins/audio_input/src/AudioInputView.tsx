import { h, Component, render } from 'preact';
import { Select } from '../../shared/ui/Select'

import AudioInputModule from '.';
import { StereoVUMeter } from './StereoVUMeter';
import { VUMeter } from './VUMeter';

export interface AudioInputViewProps {
  plugin: AudioInputModule
}

export class AudioInputView extends Component<AudioInputViewProps, any> {
  constructor() {
    super();
  }

  componentDidMount(): void {
    this.props.plugin.audioNode.callback = () => {
      this.forceUpdate()
    }
  }

  componentWillUnmount(): void {
    this.props.plugin.audioNode.callback = undefined
  }

  mutePressed() {
    this.props.plugin.audioNode.setMute(!this.props.plugin.audioNode.muted)

    this.forceUpdate()
  }

  selectChannels(index: string) {
    this.props.plugin.audioNode.channelMapIndex = parseInt(index)

    this.props.plugin.audioNode.updateFromState()
  }

  render() {
    h("div", {})

    let node = this.props.plugin.audioNode
    if (!node || !node.stream) {
      return <div>Loading...</div>
    }
    
    let tracks = node.stream.getAudioTracks().map(t => <div>{t.label}</div>)

    let meter

    if (this.props.plugin.audioNode.channelCounter) {
      if (this.props.plugin.audioNode.channelCounter.stereo) {
        meter = <StereoVUMeter node={this.props.plugin._audioNode.channelCounter.channelCounter} width={40} height={200}></StereoVUMeter>
      } else {
        meter = <VUMeter node={this.props.plugin._audioNode.channelCounter.channelCounter} width={20} height={200}></VUMeter>
      }
    }

    let audioNode = this.props.plugin.audioNode
    let channelSelectOptions = audioNode.channelMapOptions.map(c => c.map(i=>i+1).join(" / "))

    return <div>
      <div style="display: flex; flex-direction: row; padding: 8px;">
        <div>
          {meter}
        </div>
        <div style="margin: 10px;">
          <button style="margin-bottom: 5px;" onClick={() => this.mutePressed()}>{this.props.plugin.audioNode.muted ? "Unmute" : "Mute"}</button>
          {tracks}<br />
          <Select value={() => this.props.plugin.audioNode.channelMapIndex} options={channelSelectOptions} onChange={(i) => this.selectChannels(i)}></Select>
        </div>
      </div>
    </div>
  }  
}