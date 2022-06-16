import { h, Component, render } from 'preact';
import MIDIInputModule from '.';
import { Select } from '../../shared/ui/Select'

export interface MIDIInputProps {
    plugin: MIDIInputModule
  }
  
  export class MIDIInputView extends Component<MIDIInputProps, any> {
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

    selectMIDIOutput(value: string) {
      this.props.plugin.audioNode.selectMIDIInput(parseInt(value)-1)
    }
  
    render() {
      h("div", {})

      if (!this.props.plugin.midiInitialized) {
        return <div>MIDI not initialized</div>
      }

      let options = ["None", ...this.props.plugin.audioNode.midiOut.map((out) => out.name ?? out.id)]

      return <div>
        <div style="display: flex; flex-direction: row; padding: 8px;">
          <Select label="MIDI Input:" value={() => 1+this.props.plugin.audioNode.selectedMIDIInput} options={options} onChange={(i) => this.selectMIDIOutput(i)}></Select>
        </div>
      </div>
    }

  }