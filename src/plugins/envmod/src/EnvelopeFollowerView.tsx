import { h, Component } from 'preact';
import { EnvelopeFollowerNode } from './Node';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'

import styleRoot from "./EnvelopeFollowerView.scss";

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export interface MIDIInputProps {
    plugin: EnvelopeFollowerNode
  }
  
  export class EnvelopeFollowerView extends Component<MIDIInputProps, any> {
    statePoller: number

    constructor() {
      super();
      this.pollState = this.pollState.bind(this)

      this.state = {
          "slew": {value: 1.0},
          "base": {value: 0.0},
          "range": {value: 1.0}
        }
    }

    async pollState() {
        this.state = await this.props.plugin.getParameterValues(false)

        this.statePoller = window.requestAnimationFrame(this.pollState)
    }

    paramChanged(name: string, value: number) {
        this.state[name].value = value
        this.props.plugin.setParameterValues(this.state) 
    }

    componentDidMount(): void {
      this.pollState()

      this.props.plugin.renderCallback = () => {
        this.forceUpdate()
      }
    }

    componentWillUnmount(): void {
      window.cancelAnimationFrame(this.statePoller)

      this.props.plugin.renderCallback = undefined
    }

    async targetChanged(v: string) {
      await this.props.plugin.setTargetParameter(v)
  }
  
    render() {
      h("div", {})

      let paramNames: string[] = ["--"]
      let paramIds: string[] = ["disabled"]

      if (this.props.plugin.paramList) {
          paramNames.push(...Object.keys(this.props.plugin.paramList))
          paramIds.push(...Object.keys(this.props.plugin.paramList))
      }

      return <div>
        <div class={styles.module}>
          <Select label="Param" options={paramNames} values={paramIds} value={() => this.props.plugin.targetParam} onChange={(v) => this.targetChanged(v)}/>
          <Knob label="Base" size={40} value={() => this.state['base'].value} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("base", v)}/>
          <Knob label="Range" size={40} value={() => this.state['range'].value} minimumValue={-1} bipolar={true} maximumValue={1} onChange={(v) => this.paramChanged("range", v)}/>
          <Knob label="Slew" size={40} value={() => this.state['slew'].value} minimumValue={0} maximumValue={1} onChange={(v) => this.paramChanged("slew", v)}/>

        </div>
      </div>
    }

  }