import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import AudioInputModule from '.';
import { StereoVUMeter } from './StereoVUMeter';

export interface AudioInputViewProps {
  plugin: AudioInputModule
}

export class AudioInputView extends Component<AudioInputViewProps, any> {
  constructor() {
    super();
  }

  mutePressed() {
    this.props.plugin.audioNode.setMute(!this.props.plugin.audioNode.muted)

    this.forceUpdate()
  }

  render() {
    h("div", {})

    let node = this.props.plugin.audioNode
    if (!node.stream) {
      return <div>Waiting for permission...</div>
    }
    
    let tracks = node.stream.getAudioTracks().map(t => <div>{t.label}</div>)

    return <div>
      
      <div style="display: flex; flex-direction: row; padding: 8px;">
        <div>
          <StereoVUMeter node={this.props.plugin._audioNode.streamNode} width={40} height={200}></StereoVUMeter>
        </div>
        <div style="margin: 10px;">
          <button style="margin-bottom: 5px;" onClick={() => this.mutePressed()}>{this.props.plugin.audioNode.muted ? "Unmute" : "Mute"}</button>
          {tracks}<br />
        </div>
      </div>
    </div>


  }

  css(): string {
    return `
      .reverb-module {
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