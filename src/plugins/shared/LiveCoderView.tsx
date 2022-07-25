import { Component, h } from 'preact';
import {DynamicParameterView} from "./DynamicParameterView"

import * as monaco from 'monaco-editor';
import { MultiplayerHandler } from './collaboration/MultiplayerHandler';
import { DynamicParameterNode } from './DynamicParameterNode';

import styleRoot from "./LiveCoderView.scss"

export interface LiveCoderNode extends DynamicParameterNode {
  error?: any
  renderCallback?: () => void
  multiplayer?: MultiplayerHandler
  runPressed(): void
	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor
}

export interface LiveCoderViewProps {
  plugin: LiveCoderNode
}

type LiveCoderViewState = {
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
      panel: "GUI",
      runCount: 0
    }
    this.runPressed = this.runPressed.bind(this)
    this.panelPressed = this.panelPressed.bind(this)
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.props.plugin.renderCallback = () => {        
        this.forceUpdate()
    }
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    if (this.props.plugin.multiplayer) {
      this.props.plugin.multiplayer.unregisterEditor()
    }

    this.props.plugin.renderCallback = undefined
    
    if (this.editor) {
      this.editor.dispose()
    }
  }

  runPressed() {
    this.props.plugin.runPressed()
  }

  panelPressed() {
    let newPanel: "CODE" | "GUI"

    switch(this.state.panel) {
      case "GUI":
        newPanel = "CODE"
        break
      case "CODE":
        newPanel = "GUI"
        break
    }

    this.setState({panel:newPanel})

    //this.forceUpdate()
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

    const statusStyle = "padding: 2px; margin: 4px; " + (this.props.plugin.error ? "background-color: yellow;" : contentChanged ? "background-color: gray;" : "background-color: green;")

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

    let result = (
    <div class="LiveCoderModule">
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; justify-content: space-between; width: 100%">
          <div>
            <button onClick={this.runPressed} style="padding: 2px; margin: 4px; background-color: rgb(16, 185, 129)">Run</button>
            <button onClick={this.panelPressed} style="padding: 2px; margin: 4px; background-color: rgb(16, 185, 129)">{panelLabel}</button> 
          </div>

          <div style={statusStyle}>
            { this.props.plugin.error != undefined ? this.props.plugin.error.toString() : "Running" }
          </div>
        </div>
      </div>
      {panel}
    </div>)

    return result
  }

}