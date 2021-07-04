import { h, Component, render } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import { Select } from '../../shared/ui/Select'
import { Fader } from '../../shared/ui/Fader'

import Synth101 from '.';
import { WamParameterDataMap } from 'sdk/src/api/types';

// TODO put these in one spot and export them
let waves = ["sine", "square", "sawtooth", "triangle"]
let lfoWaves: OscillatorType[] = ["triangle", "square"]
let ranges = ["32'", "16'", "8'", "4'"]
let pwms = ["LFO", "Manual", "Env"]
let subRanges = ["-10ct", "-20ct pulse", "-20ct sine", "-20ct tri"]
let vcaSources = ["Env", "Gate"]
let envTriggers = ["Gate", "Trig", "Both"]
let portamentoModes = ["Off", "Auto", "On"]

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
  
    render() {
      h("div", {})

      return <div class="root">
          <div class="synth-101">
            <div class="synth-101-section">
            <div class="synth-101-header">Portamento</div>
            <div class="synth-101-section-content" style="flex-direction: column">
              <Knob label="Time" value={() => this.value("portamentoTime") } onChange={(e) => this.parameterChanged("portamentoTime", e)}/>
              <Select label="Mode" options={portamentoModes} value={() => this.value("portamentoMode")} onChange={(e) => this.parameterChanged("portamentoMode", parseInt(e))} />
            </div>
          </div>
          <div class="synth-101-section">
            <div class="synth-101-header">LFO</div>
            <div class="synth-101-section-content" style="flex-direction: column">
              <Knob label="Rate" value={() => this.value("lfoRate")} onChange={(e) => this.parameterChanged("lfoRate", e)}/>
              <Select label="Waveform" options={lfoWaves} value={() => this.value("lfoWaveform")} onChange={(e) => this.parameterChanged("lfoWaveform", parseInt(e))} />
            </div>
          </div>
          <div class="synth-101-section">
            <div class="synth-101-header">Oscillator</div>
            <div class="synth-101-section-content">
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
          <div class="synth-101-section">
            <div class="synth-101-header">Mixer</div>
            <div class="synth-101-section-content">
              {this.fader("Pulse", "mixerPulse")}
              {this.fader("Saw", "mixerSaw")}
              {this.fader("Sub", "mixerSub")}
              {this.fader("Noise", "mixerNoise")}
            </div>
          </div>
          <div class="synth-101-section">
            <div class="synth-101-header">Filter</div>
            <div class="synth-101-section-content">
              {this.fader("Freq", "filterFreq")}
              {this.fader("Res", "filterRes")}
              <div style="width: 10px;"> </div>
              {this.fader("Env", "filterEnv")}
              {this.fader("Mod", "filterMod")}
              {this.fader("Kybd", "filterKeyboard")}
            </div>
          </div>
          <div class="synth-101-section">
          <div class="synth-101-header">VCA / Env</div>
          <div class="synth-101-section-content">
            <div style="display: flex; flex-direction: column">
              <Select label="VCA" options={vcaSources} value={() => this.value("vcaSource")} onChange={(e) => this.parameterChanged("vcaSource", parseInt(e))} />
            </div>
            {this.fader("A", "envAttack")}
            {this.fader("D", "envDecay")}
            {this.fader("S", "envSustain")}
            {this.fader("R", "envRelease")}
            </div>
        </div>
        <style>
          {this.css()}
        </style>
        </div>
      </div>
    }

    fader(label: string, param: string) {
      return <Fader label={label} value={() => this.value(param)} onChange={(e) => this.parameterChanged(param,e)}/>
    }

    css() {
      return `
      .root {
        background-color: #4773cc;
        display: flex;
        flex: 1;
        height: 100%;
        width: 100%;
      }

      .synth-101 {
        color: white;
        display: flex;
        justify-content: center;
        margin: auto;
    }
    
    .synth-101 .component-wrapper {
        padding: 5px;
    }
    
    .synth-101-section {
        /* border: 1px solid white; */
        border: 1px solid rgba(0,0,0,0.3);
    
        border-radius: 2px;
        margin: 5px;
        display: flex;
        flex-direction: column;
    }
    
    .synth-101-header {
        background-color: rgba(0,0,0,0.2);
        padding: 2px;
    }
    
    .synth-101-section-content {
        display: flex;
        justify-content: stretch;
        flex: 1;
        padding: 10px;
    }
    
    /* UI elements */
    
    .component-wrapper {
        display: flex;
        flex-direction: column; 
        align-content: center; 
        text-align: center;
        flex: 1;
    }
    
    .component-knob, .component-fader {
        margin-top: auto;
    }
    
    .component-select {
        margin-top: auto;
        margin-bottom: 3px;
    }
    `
    }
  }