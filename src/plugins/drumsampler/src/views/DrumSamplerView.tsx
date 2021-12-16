import { h, Component, render } from 'preact';
import { Knob } from '../../../shared/ui/Knob'
import { Select } from '../../../shared/ui/Select'
import { Fader } from '../../../shared/ui/Fader'

import DrumSampler from '..';

import styles from './DrumSamplerView.scss';

export interface DrumSamplerViewProps {
    plugin: DrumSampler
    initialState: Record<string, number>
}

type DrumSamplerState = {
  selectedPad: number
}

export class DrumSamplerView extends Component<DrumSamplerViewProps, DrumSamplerState> {
  wamState!: Record<string, number>
  automationStatePoller: number

  constructor() {
    super();
    this.pollAutomationState = this.pollAutomationState.bind(this)
    this.state = {
      selectedPad: 0,
    }
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.wamState = this.props.initialState
    this.automationStatePoller = window.requestAnimationFrame(this.pollAutomationState)
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    window.cancelAnimationFrame(this.automationStatePoller)
  }

  renderVoice(index: number) {
    var slot = this.props.plugin.audioNode.state.slots[index]
    var voice = this.props.plugin.audioNode.voices[index]

    return <div style="display: flex; flex-direction: column; padding-left: 5px; padding-right: 5px; width: 60px;">
      <label>{index+1}</label>
      {this.knob("Tone", `tone${index+1}`, -1, 1)}
      {this.knob("Pan", `pan${index+1}`, -1, 1)}
      {this.knob("Gain", `gain${index+1}`, 0, 1.5)}

      <label>{slot ? slot.name : ""}</label>
      
    </div>
  }

  renderPads() {
    return <div class={styles.bigPanel}>
      Pads
    </div>
  }

  renderPadEditor() {
    return <div class={styles.bigPanel}>
      Editor
    </div>
  }

  render() {
    return <div class={styles.root}>
      {this.renderPads()}
      {this.renderPadEditor()}
    </div>
  }

  Oldrender() {
    h("div", {})

    var voices = []
    for (let i = 0; i < this.props.plugin.audioNode.voices.length; i++) {
      voices.push(this.renderVoice(i))
    }

    return <div style="display: flex; flex-direction: row; justify-content: center; ">
        {voices}
        <div style="display: flex; flex-direction: column; padding-left: 5px; padding-right: 5px; width: 60px;">
          <label>Master</label>
          {this.knob("Compress", `compression`, 0, 1)}
        </div>
      </div>
  }

  knob(label: string, param: string, low: number, high: number) {
    return <Knob label={label} size={40} bipolar={low < 0} defaultValue={low < 0 ? 0 : 1} minimumValue={low} maximumValue={high} value={() => this.value(param)} onChange={(e) => this.parameterChanged(param,e)}/>
  }

  parameterChanged(name: string, value: number) {
    this.wamState[name] = value
    
    this.props.plugin.audioNode.paramMgr.setParamValue(name, value)
  }

  async pollAutomationState() {
    this.wamState = await this.props.plugin.audioNode.paramMgr.getParamsValues()
    this.automationStatePoller = window.requestAnimationFrame(this.pollAutomationState)
  }

  value(name: string) {
    if (this.wamState && this.wamState[name]) {
      return this.wamState[name]
    } else {
      return 0
    }
  }
}
