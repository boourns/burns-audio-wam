import { Component, h } from 'preact';
import {DynamicParameterView} from "./DynamicParameterView"

import * as monaco from 'monaco-editor';
import { MultiplayerHandler } from './collaboration/MultiplayerHandler';
import { DynamicParameterNode } from './DynamicParameterNode';

export interface LiveCoderNode extends DynamicParameterNode {
  renderCallback?: (e: any) => void
  multiplayer?: MultiplayerHandler
  runPressed(): void
	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor
}

export interface LiveCoderViewProps {
  plugin: LiveCoderNode
}

type LiveCoderViewState = {
  error: string | undefined
  panel: "GUI" | "CODE"
  runCount: number
}

export class LiveCoderView extends Component<LiveCoderViewProps, LiveCoderViewState> {
  statePoller: number
  ref: HTMLDivElement | null
  editor: monaco.editor.IStandaloneCodeEditor

  constructor() {
    super();
    this.state = {
      error: undefined,
      panel: "GUI",
      runCount: 0
    }
    this.runPressed = this.runPressed.bind(this)
    this.panelPressed = this.panelPressed.bind(this)
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.props.plugin.renderCallback = (error) => {
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
    this.props.plugin.runPressed()

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

    this.editor = this.props.plugin.createEditor(ref)

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
        <DynamicParameterView plugin={this.props.plugin}></DynamicParameterView>
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

  
  
}