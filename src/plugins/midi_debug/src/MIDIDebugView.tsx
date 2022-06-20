import { h, Component, render } from 'preact';
import MIDIDebugModule from '.';
import { Select } from '../../shared/ui/Select'

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
      
      return <div></div>
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

      let content = messages.map(m => <div>{m}</div>)

      return <div>
        <div style="display: flex; flex-direction: row; padding: 8px; font-family: 'Courier New', monospace;">
          {content}
        </div>
      </div>
    }

  }