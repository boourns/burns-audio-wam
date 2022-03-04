import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import AudioInputModule from '.';

export interface AudioInputViewProps {
  plugin: AudioInputModule
}

export class AudioInputView extends Component<AudioInputViewProps, any> {
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