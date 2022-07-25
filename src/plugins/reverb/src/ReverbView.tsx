import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import ConvolutionReverb from '.'
import { IRListEntry } from './Node';

import styleRoot from "./ReverbView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export interface ConvolutionReverbViewProps {
  plugin: ConvolutionReverb
}

export type ConvolutionReverbViewState = {
  IRList: IRListEntry[]
}

export class ConvolutionReverbView extends Component<ConvolutionReverbViewProps, ConvolutionReverbViewState> {
  constructor() {
    super();
    this.state = {
      IRList: []
    }
  }

  // Lifecycle: Called whenever our component is created
  componentWillMount() {
    this.setState({
      IRList: this.props.plugin.audioNode.IRs()
    })
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
  }

  paramChanged(param: string, value: any) {
    this.props.plugin.audioNode.paramMgr.setParamValue(param, value)
  }

  updateIR(id: string) {
    this.props.plugin.audioNode.setState({ir: id})
  }

  render() {
    h("div", {})

    let params = this.props.plugin.audioNode.paramMgr

    let irOptions = this.state.IRList.map(e => e.name)
    let irValues = this.state.IRList.map(e => e.id)

    return (
    <div class={styles.reverbModule}>
        <div style="display: flex">
            <Select options={irOptions} values={irValues} value={() => this.props.plugin.audioNode.state.ir} label="Model" onChange={(v) => this.updateIR(v)} />
            <Knob label="Mix" size={40} value={() => params.getParamValue("wet")} minimumValue={0.0} maximumValue={1} onChange={(v) => this.paramChanged("wet", v)}/>
        </div>

        <div style="flex: 1">
        </div>
    </div>)
  }  
}