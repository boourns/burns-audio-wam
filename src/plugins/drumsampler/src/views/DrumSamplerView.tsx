import { h, Component } from 'preact';
import { Knob } from '../../../shared/ui/Knob'

import DrumSampler from '..';

import styleRoot from './DrumSamplerView.scss';
import { DrumSamplerKit } from '../Kit';
import { DrumSamplerVoiceState } from '../Voice';
import {WaveformView} from "./WaveformView"
import { WamAsset } from 'wam-extensions';

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

const c = (a: string[]) => a.filter(el => !!el).join(" ")

type KitPad = {
  label: string
  note: number
}

type Kit = {
  pads: KitPad[]
}

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
  kit: DrumSamplerKit

  constructor() {
    super();
    this.pollAutomationState = this.pollAutomationState.bind(this)
    this.state = {
      selectedPad: 0,
    }
  }

  componentWillMount(): void {
    this.wamState = this.props.initialState
    this.kit = this.props.plugin.audioNode.kit
  }

  componentDidMount() {
    this.automationStatePoller = window.requestAnimationFrame(this.pollAutomationState)
  }

  componentWillUnmount() {
    window.cancelAnimationFrame(this.automationStatePoller)
  }

  renderVoice(index: number) {
    var slot = this.props.plugin.audioNode.kit.state.slots[index]
    var voice = this.props.plugin.audioNode.kit.voices[index]

    return <div style="display: flex; flex-direction: column; padding-left: 5px; padding-right: 5px; width: 60px;">
      <label>{index+1}</label>
      {this.knob("Tone", `tone${index+1}`, -1, 1)}
      {this.knob("Pan", `pan${index+1}`, -1, 1)}
      {this.knob("Gain", `gain${index+1}`, 0, 1.5)}

      <label>{slot ? slot.name : ""}</label>
      
    </div>
  }

  selectPad(index: number) {
    this.setState({selectedPad: index})
  }

  renderPad(index: number) {
    let slot = this.kit.state.slots[index]

    return <div class={styles.padContainer}>
      <div class={c([styles.pad, this.state.selectedPad == index && styles.padSelected])} onClick={() => this.selectPad(index)}>
        <div class={styles.padLabel}>
          {slot?.name}
        </div>
      </div>
    </div>
  }

  renderPadRow(index: number) {
    return <div class={styles.padRow}>
      {this.renderPad(index)}
      {this.renderPad(index+1)}
      {this.renderPad(index+2)}
      {this.renderPad(index+3)}
    </div>
  }

  renderPads() {
    return <div class={styles.bigPanel}>
      {this.renderPadRow(12)}
      {this.renderPadRow(8)}
      {this.renderPadRow(4)}
      {this.renderPadRow(0)}
    </div>
  }

  loadAsset(index: number) {
    if (!window.WAMExtensions.assets) {
      console.error("Host must implement asset WAM extension")
      return
    }
    
    window.WAMExtensions.assets.pickAsset(this.props.plugin.instanceId, "AUDIO", async (asset: WamAsset) => {
      
      let slot = {...this.props.plugin.audioNode.kit.state.slots[index]}
      slot.name = asset.name
      slot.uri = asset.uri

      this.props.plugin.audioNode.kit.updateSlot(index, slot)

    })
  }

  renderEditorTitleBar(index: number, slot: DrumSamplerVoiceState) {
    return <div class={styles.editorTitleBar} >
      <div class={styles.editorTitle}>
        {slot.name}
      </div>
      <button class={styles.button} onClick={() => { this.loadAsset(index) } }>Load</button>
    </div>
  }

  renderWaveform() {
    let buffer = this.props.plugin.audioNode.kit.buffers[this.state.selectedPad]
    return <WaveformView width={400} height={175} buffer={buffer}></WaveformView>
  }

  renderControls(slot: DrumSamplerVoiceState) {
    let index = this.state.selectedPad

    return <div class={styles.controlPanel}>
        <div class={styles.controlPanelHead}>
          Output
        </div>
        <div class={styles.controlPanelContent}>
          {this.knob("Tone", `tone${index+1}`, -1, 1)}
          {this.knob("Pan", `pan${index+1}`, -1, 1)}
          {this.knob("Gain", `gain${index+1}`, 0, 1.5)}
        </div>
    </div>
  }

  renderPadEditor() {
    let slot = this.kit.state.slots[this.state.selectedPad]
    
    return <div class={styles.bigPanel}>
      <div style="display: flex; flex-direction: column;">
        {this.renderEditorTitleBar(this.state.selectedPad, slot)}
        {this.renderWaveform()}
      </div>

      {this.renderControls(slot)}
    </div>
  }

  render() {
    h("div", {})

    return <div class={styles.root}>
      {this.renderPads()}
      {this.renderPadEditor()}
    </div>
  }

  knob(label: string, param: string, low: number, high: number) {
    return <div class={styles.knobContainer}>
      <Knob label={label} size={40} bipolar={low < 0} defaultValue={low < 0 ? 0 : 1} minimumValue={low} maximumValue={high} value={() => this.value(param)} onChange={(e) => this.parameterChanged(param,e)}/>
    </div>
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
