import { h, Component } from 'preact';
import { Select } from '../../shared/ui/Select'
import 'wam-extensions'
import ButterchurnNode from './Node';

export interface ButterchurnProps {
    plugin: ButterchurnNode
  }
  
  export class ButterchurnView extends Component<ButterchurnProps, any> {
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

    presetChanged(e: any) {
      console.log("presetChanged ", e)
       this.props.plugin.selectPreset(e.target.value)
    }
  
    render() {
      h("div", {})

      let presets = Object.keys(this.props.plugin.presets).map(p => <option value={p} selected={p == this.props.plugin.chosenPreset}>{p}</option>)

      return <div style="background-color: gray; width: 100%">
        <div style="display: flex; flex-direction: row; padding: 8px;">
           Preset: <select onChange={(e) => this.presetChanged(e)}>{presets}</select>
        </div>
      </div>
    }

  }