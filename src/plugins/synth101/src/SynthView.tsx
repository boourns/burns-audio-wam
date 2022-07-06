import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'
import { Fader } from '../../shared/ui/Fader'

import Synth101 from '.';

// TODO put these in one spot and export them
let waves = ["sine", "square", "sawtooth", "triangle"]
let lfoWaves: OscillatorType[] = ["triangle", "square"]
let ranges = ["32'", "16'", "8'", "4'"]
let pwms = ["LFO", "Manual", "Env"]
let subRanges = ["-10ct", "-20ct pulse", "-20ct sine", "-20ct tri"]
let vcaSources = ["Env", "Gate"]
let envTriggers = ["Gate", "Trig", "Both"]
let portamentoModes = ["Off", "Auto", "On"]

import styleRoot from "./Synth101.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export interface SynthViewProps {
    plugin: Synth101
    initialState: Record<string, number>
  }
  
  export class SynthView extends Component<SynthViewProps, any> {
    automationStatePoller: number
    wamState!: Record<string, number>

    constructor() {
      super();
      this.pollAutomationState = this.pollAutomationState.bind(this)
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
  
    parameterChanged(name: string, value: number) {
      this.wamState[name] = value
      
      //this.props.plugin.audioNode.setParameterValues(this.wamState)

      this.props.plugin.audioNode.paramMgr.setParamValue(name, value)
    }

    async pollAutomationState() {
      this.wamState = this.props.plugin.audioNode.paramMgr.getParamsValues()
      this.automationStatePoller = window.requestAnimationFrame(this.pollAutomationState)
    }

    value(name: string) {
      if (this.wamState && this.wamState[name]) {
        return this.wamState[name]
      } else {
        return 0
      }
    }
  
    render() {
      h("div", {})

      return <div class={styles.root}>
          <div class={styles.synth101}>
            <div class={styles.section}>
            <div class={styles.header}>Portamento</div>
            <div class={styles.content} style="flex-direction: column">
              <Knob label="Time" value={() => this.value("portamentoTime") } onChange={(e) => this.parameterChanged("portamentoTime", e)}/>
              <Select label="Mode" options={portamentoModes} value={() => this.value("portamentoMode")} onChange={(e) => this.parameterChanged("portamentoMode", parseInt(e))} />
            </div>
          </div>
          <div class={styles.section}>
            <div class={styles.header}>LFO</div>
            <div class={styles.content} style="flex-direction: column">
              <Knob label="Rate" value={() => this.value("lfoRate")} onChange={(e) => this.parameterChanged("lfoRate", e)}/>
              <Select label="Waveform" options={lfoWaves} value={() => this.value("lfoWaveform")} onChange={(e) => this.parameterChanged("lfoWaveform", parseInt(e))} />
            </div>
          </div>
          <div class={styles.section}>
            <div class={styles.header}>Oscillator</div>
            <div class={styles.content}>
              <div style="display: flex; flex-direction: column">
                <Knob label="Tune" value={() => this.value("detune")} minimumValue={-0.5} maximumValue={0.5} bipolar={true} onChange={(e) => this.parameterChanged("detune", e)}/>
                <Select label="Range" options={ranges} value={() => this.value("oscRange")} onChange={(e) => this.parameterChanged("oscRange", parseInt(e))} />
              </div>
              {this.fader("Mod", "oscMod")}
              {this.fader("PW", "pulseWidth")}
              <div style="display: flex; flex-direction: column">
                <Select label="PWM" options={pwms} value={() => this.value("pwmSource")} onChange={(e) => this.parameterChanged("pwmSource", parseInt(e))} />
                <Select label="Sub Range" options={subRanges} value={() => this.value("subRange")} onChange={(e) => this.parameterChanged("subRange", parseInt(e))} />
                </div>        
            </div>
          </div>
          <div class={styles.section}>
            <div class={styles.header}>Mixer</div>
            <div class={styles.content}>
              {this.fader("Pulse", "mixerPulse")}
              {this.fader("Saw", "mixerSaw")}
              {this.fader("Sub", "mixerSub")}
              {this.fader("Noise", "mixerNoise")}
            </div>
          </div>
          <div class={styles.section}>
            <div class={styles.header}>Filter</div>
            <div class={styles.content}>
              {this.fader("Freq", "filterFreq")}
              {this.fader("Res", "filterRes")}
              <div style="width: 10px;"> </div>
              {this.fader("Env", "filterEnv")}
              {this.fader("Mod", "filterMod")}
              {this.fader("Kybd", "filterKeyboard")}
            </div>
          </div>
          <div class={styles.section}>
          <div class={styles.header}>VCA / Env</div>
          <div class={styles.content}>
            <div style="display: flex; flex-direction: column">
              <Select label="VCA" options={vcaSources} value={() => this.value("vcaSource")} onChange={(e) => this.parameterChanged("vcaSource", parseInt(e))} />
            </div>
            {this.fader("A", "envAttack")}
            {this.fader("D", "envDecay")}
            {this.fader("S", "envSustain")}
            {this.fader("R", "envRelease")}
            </div>
        </div>
        </div>
      </div>
    }

    fader(label: string, param: string) {
      return <Fader label={label} value={() => this.value(param)} onChange={(e) => this.parameterChanged(param,e)}/>
    }
  }