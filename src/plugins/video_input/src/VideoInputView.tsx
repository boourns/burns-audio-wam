import { h, Component, render } from 'preact';

import styleRoot from "./VideoInput.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot


import AudioInputModule from '.';

export interface VideoInputViewProps {
  plugin: AudioInputModule
}

export class VideoInputView extends Component<VideoInputViewProps, any> {
  constructor() {
    super();
  }

  render() {
    h("div", {})

    let node = this.props.plugin.audioNode
    if (!node.stream) {
      return <div>Waiting for permission...</div>
    }
    
    let tracks = node.stream.getAudioTracks().map(t => <div>{t.label}</div>)

    return <div>
      Stream: {node.stream.id}<br />
      Tracks: {tracks}
    </div>

  }
}