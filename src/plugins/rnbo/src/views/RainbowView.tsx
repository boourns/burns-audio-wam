import { h, Component, render } from 'preact';
import { Select } from '../../../shared/ui/Select'
import { Knob } from '../../../shared/ui/Knob'

import AudioInputModule from '..';

import styleRoot from "./RainbowView.scss"
import { WamParameterInfo, WamParameterInfoMap } from '@webaudiomodules/api';

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export interface AudioInputViewProps {
  plugin: AudioInputModule
}

export class RainbowView extends Component<AudioInputViewProps, any> {
  paramInfo: WamParameterInfoMap

  constructor() {
    super();
  }

  async componentDidMount() {
    this.props.plugin.audioNode.callback = () => {
      this.forceUpdate()
    }
    await this.updateParameters()
  }

  componentWillUnmount() {
    this.props.plugin.audioNode.callback = undefined
  }

  valueChanged(id: string, value: number) {
    this.props.plugin.audioNode.paramMgr.setParamValue(id, value)
  }

  getValue(param: WamParameterInfo) {
    return this.props.plugin.audioNode.paramMgr.getParamValue(param.id)
  }

  renderParam(p: WamParameterInfo) {
    switch (p.type) {
      case "float":
        return <Knob onChange={(v) => this.valueChanged(p.id, v)}
          minimumValue={p.minValue}
          maximumValue={p.maxValue}
          value={() => this.getValue(p)}
          label={p.label || p.id}
          bipolar={p.minValue < 0}
        >
        </Knob>
      case "int":
        return <Knob onChange={(v) => this.valueChanged(p.id, Math.round(v))}
          minimumValue={p.minValue}
          maximumValue={p.maxValue}
          value={() => this.getValue(p)}
          label={p.label || p.id}
          bipolar={p.minValue < 0}
          integer={true}
        >
        </Knob>
      case "boolean":
        return <Select onChange={(v) => this.valueChanged(p.id, parseInt(v))}
          options={["off", "on"]}
          value={() => this.getValue(p)}
          label={p.label || p.id}
        >
        </Select>
      case "choice":
        return <Select onChange={(v) => this.valueChanged(p.id, parseInt(v))}
          options={p.choices}
          value={() => this.getValue(p)}
          label={p.label || p.id} />

      default:
        return <div>unknown!</div>
    }
  }

  async updateParameters() {
    this.paramInfo = await this.props.plugin.audioNode.getParameterInfo()

    this.forceUpdate()
  }

  renderParameters() {
    if (!this.paramInfo) {
      return []
    }

    return Object.keys(this.paramInfo).map(id => this.renderParam(this.paramInfo[id]))
  }


  render() {
    h("div", {})

    let node = this.props.plugin.audioNode
    if (!node || !node.device || !this.paramInfo) {
      return <div>Loading...</div>
    }

    return <div class={styles.RNBOMain}>
      <div style="display: flex; flex-direction: column; margin: 10px; border: 1px solid black; border-radius: 1%; padding: 5px;">
        🌈
        <div style="display: flex; flex-direction: row; margin: 5px;">
          {this.renderParameters()}
        </div>
      </div>
    </div>
  }
}

