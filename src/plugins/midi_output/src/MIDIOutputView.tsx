import { h, Component, render } from 'preact';
import MIDIOutputModule from '.';
import { Select } from '../../shared/ui/Select'
import MIDIOutputNode from './Node';
import 'wam-extensions'

export interface MIDIOutputProps {
    plugin: MIDIOutputNode
  }
  
  export class MIDIOutputView extends Component<MIDIOutputProps, any> {
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
      this.props.plugin.selectMIDIOutput(value)
    }
  
    render() {
      h("div", {})

      if (!this.props.plugin.midiInitialized) {
        return <div><div style="background-color: gray; width: 100%;">This plugin requires a browser that supports WebMIDI.</div></div>
      }

      if (!window.WAMExtensions.userSetting.get) {
        return <div>Host must support userSetting WAM extension</div>
      }

      let options = ["None", ...this.props.plugin.midiOut.map((out) => out.name ?? out.id)]
      let values = [ "none", ...this.props.plugin.midiOut.map((out) => out.id)]

      let selectedValue = window.WAMExtensions.userSetting.get(this.props.plugin.instanceId, "selectedMidiPort")
      if (!selectedValue || !values.includes(selectedValue)) {
        selectedValue = "none"
      }

      return <div style="background-color: gray; width: 100%;">
        <div style="display: flex; flex-direction: row; padding: 8px;">
          <Select label="MIDI Output:" value={() => selectedValue} values={values} options={options} onChange={(i) => this.selectMIDIOutput(i)}></Select>
        </div>
      </div>
    }

  }