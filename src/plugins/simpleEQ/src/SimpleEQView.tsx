import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'

import SimpleEQ from '.'

import styleRoot from "./SimpleEQView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export interface SimpleEQProps {
  plugin: SimpleEQ
}

export class SimpleEQView extends Component<SimpleEQProps, any> {
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
      <div class={styles.wrapper}>
        <div class={styles.simpleeqModule}>
            <div class={styles.group}>
              <div class={styles.groupHeader}>Low</div>
              <div class={styles.groupContent}>
                <Knob label="Freq" value={() => params.getParamValue("lowFrequency")} minimumValue={20} maximumValue={400} onChange={(v) => this.paramChanged("lowFrequency", v)}/>
                <Knob label="Gain" value={() => params.getParamValue("lowGain")} minimumValue={-40} maximumValue={40} bipolar={true} onChange={(v) => this.paramChanged("lowGain", v)}/>
              </div>
            </div>

            <div class={styles.group}>
              <div class={styles.groupHeader}>Med</div>
              <div class={styles.groupContent}>
                <Knob label="Freq" value={() => params.getParamValue("mediumFrequency")} minimumValue={200} maximumValue={1000} onChange={(v) => this.paramChanged("mediumFrequency", v)}/>
                <Knob label="Gain" value={() => params.getParamValue("mediumGain")} minimumValue={-40} maximumValue={40} bipolar={true} onChange={(v) => this.paramChanged("mediumGain", v)}/>
              </div>
            </div>

            <div class={styles.group}>
            <div class={styles.groupHeader}>High</div>
              <div class={styles.groupContent}>
                <Knob label="Freq" value={() => params.getParamValue("highFrequency")} minimumValue={6000} maximumValue={12000} onChange={(v) => this.paramChanged("highFrequency", v)}/>
                <Knob label="Gain" value={() => params.getParamValue("highGain")} minimumValue={-40} maximumValue={40} bipolar={true} onChange={(v) => this.paramChanged("highGain", v)}/>
              </div>
            </div>
        </div>
    </div>

    )
  }
}