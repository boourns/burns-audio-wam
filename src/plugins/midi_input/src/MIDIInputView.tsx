import { h, Component, render } from 'preact';
import MIDIInputModule from '.';
import { Select } from '../../shared/ui/Select'
import { MIDIInputNode } from './Node';

export interface MIDIInputProps {
    plugin: MIDIInputNode
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
      this.props.plugin.selectMIDIInput(value)
    }
  
    render() {
      h("div", {})

      if (!this.props.plugin.midiInitialized) {
        return <div>MIDI not initialized</div>
      }

      if (!window.WAMExtensions.userSetting.get) {
        return <div>Host must support userSetting WAM extension</div>
      }

      let options = ["None", ...this.props.plugin.midiIn.map((out) => out.name ?? out.id)]
      let values = [ "none", ...this.props.plugin.midiIn.map((out) => out.id)]

      let selectedValue = window.WAMExtensions.userSetting.get(this.props.plugin.instanceId, "selectedMidiPort")
      if (!selectedValue || !values.includes(selectedValue)) {
        selectedValue = "none"
      }

      return <div>
        <div style="display: flex; flex-direction: row; padding: 8px;">
          <Select label="MIDI Input:" value={() => selectedValue} values={values} options={options} onChange={(i) => this.selectMIDIOutput(i)}></Select>
        </div>
      </div>
    }

  }