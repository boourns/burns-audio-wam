import { h, Component, Fragment } from 'preact';
import MIDIDebugModule from '.';
import { MIDIMessageAnalyzer } from './MIDIMessageAnalyzer';

export interface MIDIDebugProps {
    plugin: MIDIDebugModule
  }
  
  export class MIDIDebugView extends Component<MIDIDebugProps, any> {
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

    renderMIDIMessage(msg: number[]) {
      let a = new MIDIMessageAnalyzer(msg)
      return <>
      <tr>
        <td colSpan={2}>{msg.join(" ")}</td>
      </tr>
      <tr>
        <td>{a.description().join(" ")}</td>
        <td><button>Replay</button></td>
      </tr>
      </>
    }
  
    render() {
      h("div", {})

      let messages: number[][] = [
        [0xb0, 44, 0],
        [0xcc, 0xf0, 0],
        [0xb0, 44, 0],
        [0xcc, 0xf0, 0],
        [0xb0, 44, 0],
        [0xcc, 0xf0, 0],        
        [0xb0, 44, 0],
        [0xcc, 0xf0, 0],
        [0xb0, 44, 0],
        [0xcc, 0xf0, 0],
      ]

      let content = messages.map(m => this.renderMIDIMessage(m))

      return <div style="width: 100%;">
        <div style="display: flex; flex-direction: row;">
          <button>Clear</button>
        </div>
        <div style="display: flex; flex-direction: column; background-color: white; color: black; padding: 8px; font-family: 'Courier New', monospace;">
          <table>
            {content}
          </table>
        </div>
      </div>
    }

  }