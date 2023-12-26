import { Component, h } from 'preact';
import {DynamicParameterView} from "./DynamicParameterView"

import * as monaco from 'monaco-editor';
import { DocumentHandler } from './collaboration/DocumentHandler';
import { DynamicParameterNode } from './DynamicParameterNode';

export interface LiveCoderNode extends DynamicParameterNode {
  error?: string

  renderCallback?: () => void
  multiplayers: DocumentHandler[]
  runPressed(): void
	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor
}

export interface LiveCoderViewProps {
  plugin: LiveCoderNode
  actions: h.JSX.Element[]
  parametersView?: () => h.JSX.Element
}

type LiveCoderViewState = {
  panel: "GUI" | "CODE"
  runCount: number
}

export class LiveCoderView extends Component<LiveCoderViewProps, LiveCoderViewState> {
  statePoller: number
  ref: HTMLDivElement | null
  editor: monaco.editor.IStandaloneCodeEditor
  selectedMultiplayer: number

  constructor() {
    super();
    this.state = {
      panel: "GUI",
      runCount: 0,
    }
    this.selectedMultiplayer = 0
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
    if (this.props.plugin.multiplayers.length > 0) {
      this.props.plugin.multiplayers[this.selectedMultiplayer].unregisterEditor()
    }

    this.props.plugin.renderCallback = undefined
    
    if (this.editor) {
      this.editor.dispose()
    }
  }

  runPressed() {
    this.props.plugin.runPressed()
  }

  panelPressed(newPanel: "CODE" | "GUI") {

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

    if (this.props.plugin.multiplayers.length > 0) {
      this.props.plugin.multiplayers[this.selectedMultiplayer].registerEditor(this.editor)
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

  editFile(i: number) {
    if (i >= 0 && i < this.props.plugin.multiplayers.length) {
      if (this.editor) {
        this.props.plugin.multiplayers[this.selectedMultiplayer].unregisterEditor()
      }
      this.selectedMultiplayer = i
      if (this.editor) {
        this.props.plugin.multiplayers[this.selectedMultiplayer].registerEditor(this.editor)
      }

      this.setState({panel:"CODE"})
    } else {
      console.error("Invalid multiplayer document ID")
    }
  }

  render() {
    h("div", {})

    let contentChanged = false

    const statusStyle = "padding: 2px; margin: 4px; " + (this.props.plugin.error ? "background-color: yellow; color: black;" : contentChanged ? "background-color: gray;" : "background-color: green;")

    let panelLabel
    let panel
    switch(this.state.panel) {
      case "CODE":
        panelLabel = "GUI"
        panel = this.renderEditor()
        break
      case "GUI":
        panelLabel = "CODE"
        panel = this.props.parametersView ? this.props.parametersView() : this.renderParameters()
        break
    }

    const editFiles = this.props.plugin.multiplayers.map((m, i) => {
      return <button onClick={() => this.editFile(i)} style="padding: 2px; margin: 4px; background-color: var(--var-ButtonBackground); color: var(--var-ButtonForeground); border: 1px solid var(--var-ButtonForeground);">{m.label}</button>
    })

    let result = (
    <div class="LiveCoderModule">
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; justify-content: space-between; width: 100%">
          <div>
            <button onClick={() => this.runPressed()} style="padding: 2px; margin: 4px; background-color: var(--var-ButtonBackground); color: var(--var-ButtonForeground); border: 1px solid var(--var-ButtonForeground);">Run</button>
            <button onClick={() => this.panelPressed("GUI")} style="padding: 2px; margin: 4px; background-color: var(--var-ButtonBackground); color: var(--var-ButtonForeground); border: 1px solid var(--var-ButtonForeground);">GUI</button>

            {editFiles}
            {this.props.actions}
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