import { Component, h } from 'preact';

import {DynamicParameterView} from "../../shared/DynamicParameterView"

import * as monaco from 'monaco-editor';

import FunctionSeqModule from '.';

export interface FunctionSeqViewProps {
  plugin: FunctionSeqModule
}

type FunctionSeqViewState = {
  error: string | undefined
  panel: "GUI" | "CODE"
}

export class FunctionSeqView extends Component<FunctionSeqViewProps, FunctionSeqViewState> {
  statePoller: number
  ref: HTMLDivElement | null
  editor: monaco.editor.IStandaloneCodeEditor

  constructor() {
    super();
    this.state = {
      error: undefined,
      panel: "GUI"
    }
    this.runPressed = this.runPressed.bind(this)
    this.panelPressed = this.panelPressed.bind(this)
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.props.plugin.sequencer.renderCallback = (error) => {
      if (error != this.state.error) {
        this.setState({
          error
        })
      } else {
        this.forceUpdate()
      }
    }
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    if (this.props.plugin.multiplayer) {
      this.props.plugin.multiplayer.unregisterEditor()
    }
    
    if (this.editor) {
      this.editor.dispose()
    }
  }

  runPressed() {
    this.props.plugin.audioNode.runPressed()

    this.setState({error: undefined})
  }

  panelPressed() {
    let newState: "CODE" | "GUI"

    switch(this.state.panel) {
      case "GUI":
        newState = "CODE"
        break
      case "CODE":
        newState = "GUI"
        break
    }

    this.setState({panel:newState})
  }

  setupEditor(ref: HTMLDivElement | null) {
    if (ref == null) {
      // should deregister if loaded
      return
    }

    if (ref == this.ref) {
      return
    }
    this.ref = ref

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowJs: true

    })

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.addExtraLib(this.editorDefinition(), "")

    this.editor = monaco.editor.create(ref, {
      language: 'javascript',
      automaticLayout: true
    });


    if (this.props.plugin.multiplayer) {
      this.props.plugin.multiplayer.registerEditor(this.editor)
    }
  }

  renderEditor() {
    return <div style="width: 100%; height: 100%; flex: 1;">
      <div style="width: 100%; height: 100%; flex: 1;" ref={(ref) => this.setupEditor(ref)}></div>
    </div>
  }

  renderParameters() {
    return <div style="display: flex; flex: 1;">
        <DynamicParameterView plugin={this.props.plugin.audioNode}></DynamicParameterView>
      </div>
  }

  render() {
    h("div", {})

    let contentChanged = false

    const statusStyle = "padding: 2px; margin: 4px; " + (this.state.error ? "background-color: yellow;" : contentChanged ? "background-color: gray;" : "background-color: green;")

    let panelLabel
    let panel
    switch(this.state.panel) {
      case "CODE":
        panelLabel = "GUI"
        panel = this.renderEditor()
        break
      case "GUI":
        panelLabel = "CODE"
        panel = this.renderParameters()
        break
    }

    return (
    <div class="function-sequencer-module">
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; justify-content: space-between; width: 100%">
          <div>
            <button onClick={this.runPressed} style="padding: 2px; margin: 4px; background-color: rgb(16, 185, 129)">Run</button>
            <button onClick={this.panelPressed} style="padding: 2px; margin: 4px; background-color: rgb(16, 185, 129)">{panelLabel}</button> 
          </div>

          <div style={statusStyle}>
            { this.state.error != undefined ? this.state.error : "Running" }
          </div>
        </div>
      </div>
      {panel}
      <style>
        {this.css()}
      </style>
    </div>)
  }

  css(): string {
    return `
      .function-sequencer-module {
          flex: 1;
          background-color: #lightblue;
          display: flex;
          flex-direction:column;
          justify-content:space-between;
          width: 100%;
          height: 100%;
      }
      
      .distortion-module .component-wrapper {
          padding: 5px;
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

  editorDefinition(): string {
    return `
export type MIDINote = {
    /** MIDI Note number, 0-127 */
    note: number
    /** Note velocity, 0: off, 1-127: note on strength */
    velocity: number
    /** Note duration, measured in sequencer ticks (24 PPQN) */
    duration: number
}

export type WAMParameterDefinition = {
    /** An identifier for the parameter, unique to this plugin instance */
    id: string
    /** The parameter's human-readable name. */
    label?: string
    /** The parameter's data type */
    type?: "float" | "int"
    /** The default value for the parameter */
    defaultValue: number
    /** The lowest possible value for the parameter */
    minValue?: number
    /** The highest possible value for the parameter */
    maxValue?: number
}

export type ParameterDefinition = {
    id: string
    config: WAMParameterDefinition
}

export interface FunctionSequencer {
    parameter(): ParameterDefinition[]
    onTick(tick: number, params: Record<string, any>): MIDINote[]
}
    `
  }
  
}