import { h, Component, render } from 'preact';
import { Knob } from '../../../shared/ui/Knob'
import { Select } from '../../../shared/ui/Select'

import Distortion from '..'

import styleRoot from "./DistortionView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot


export interface DistortionViewProps {
  plugin: Distortion
}

export class DistortionView extends Component<DistortionViewProps, any> {
  constructor() {
    super();
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
  }

  paramChanged(param: string, value: any) {
    this.props.plugin.audioNode.paramMgr.setParamValue(param, value)
  }

  render() {
    h("div", {})

    let params = this.props.plugin.audioNode.paramMgr

    return (
    <div class={styles.distortionModule}>
        <div style="display: flex; margin: auto">
            <Knob label="Drive" size={40} value={() => params.getParamValue("overdrive")} minimumValue={1} maximumValue={10} onChange={(v) => this.paramChanged("overdrive", v)}/>
            <Knob label="Level" size={40} value={() => params.getParamValue("level")} minimumValue={0} maximumValue={4} onChange={(v) => this.paramChanged("level", v)}/>
            <Knob label="Symmetry" size={40} value={() => params.getParamValue("offset")} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("offset", v)}/>
        </div>
        <div style="display: flex; margin: auto">
          <Select label="Clipping" options={this.props.plugin.flavors} value={() => params.getParamValue("flavor")} onChange={(v) => this.paramChanged("flavor", parseInt(v))} />
        </div>
        <div style="flex: 1">
        </div>
    </div>)
  }
  
}