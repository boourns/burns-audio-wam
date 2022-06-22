import { h, Component, Fragment } from 'preact';
import { GenerateMIDIMessageView } from './GenerateMIDIMessageView';
import { MIDIMessageAnalyzer } from './MIDIMessageAnalyzer';
import { RecordedMIDIMessage } from './MIDIRecording';
import { MIDIDebugNode } from './Node';

export interface MIDIDebugProps {
  plugin: MIDIDebugNode
}

type MIDIDebugState = {
  modal: 'generate' | undefined
}

export class MIDIDebugView extends Component<MIDIDebugProps, MIDIDebugState> {
  constructor() {
    super();
  }

  componentDidMount(): void {
    this.props.plugin.callback = () => {
      this.forceUpdate()
    }
  }

  componentWillUnmount(): void {
    this.props.plugin.callback = undefined
  }

  renderMIDIMessage(msg: RecordedMIDIMessage) {
    let a = new MIDIMessageAnalyzer(msg.bytes)
    const dir = msg.incoming ? "<- " : "-> "
    return <>
      <tr>
        <td colSpan={2}><b>{dir}{msg.bytes.join(" ")}</b></td>
      </tr>
      <tr>
        <td>{a.description().join(" ")}</td>
        <td><button onClick={() => this.replayMessage(msg.bytes)}>Replay</button></td>
      </tr>
    </>
  }

  replayMessage(bytes: number[]) {
    this.props.plugin.emitMIDI(bytes)
  }

  clearPressed() {
    this.props.plugin.recording.clear()
  }

  showModal(modal: 'generate' | undefined) {
    this.setState({modal})
  }

  render() {
    h("div", {})

    if (this.state.modal == 'generate') {
      return <GenerateMIDIMessageView plugin={this.props.plugin} onClose={() => this.showModal(undefined)}></GenerateMIDIMessageView>
    } else {
      let content = this.props.plugin.recording.messages.map(m => this.renderMIDIMessage(m))

      return <div style="width: 100%; display: flex; flex-direction: column;">
        <div style="display: flex; flex-direction: row; height: 30px;">
          <button onClick={() => this.clearPressed()}>Clear</button>
        </div>
        <div style="display: flex; height: 100%; overflow: scroll; flex-direction: column; background-color: white; color: black; padding: 8px; font-family: 'Courier New', monospace;">
          <table cellPadding={0} cellSpacing={0}>
            {content}
          </table>
          <button onClick={() => this.showModal('generate')}>+ Generate message</button>
        </div>
      </div>
    }    
  }

}