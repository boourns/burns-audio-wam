import { Component, h } from 'preact';

import * as monaco from 'monaco-editor';
import FunctionSeqModule from '.';

export interface FunctionSeqViewProps {
  plugin: FunctionSeqModule
}

type FunctionSeqViewState = {
  error: string | undefined
  contentChanged: boolean
}

export class FunctionSeqView extends Component<FunctionSeqViewProps, FunctionSeqViewState> {
  statePoller: number
  ref: HTMLDivElement | null
  editor: monaco.editor.IStandaloneCodeEditor

  constructor() {
    super();
    this.state = {
      error: undefined,
      contentChanged: false
    }
    this.runPressed = this.runPressed.bind(this)
    this.editorChanged = this.editorChanged.bind(this)
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.props.plugin.sequencer.renderCallback = (script, error) => {
      if (script != undefined && this.editor != undefined) {
        this.editor.setValue(script)
      }
      if (error != undefined) {
        this.setState({
          error
        })
      }
    }
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    if (this.props.plugin.multiplayer) {
      this.props.plugin.multiplayer.unregisterEditor()
    }
    
    this.editor.dispose()
  }

  runPressed() {
    this.props.plugin.sequencer.upload(this.editor.getValue())
    this.setState({error: undefined, contentChanged: false})
  }

  editorChanged() {
    this.setState({contentChanged: true})
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

    this.editor = monaco.editor.create(ref, {
      value: this.props.plugin.sequencer.script,
      language: 'javascript',
      automaticLayout: true
    });

    if (this.props.plugin.multiplayer) {
      this.props.plugin.multiplayer.registerEditor(this.editor)
    }

    this.editor.onDidChangeModelContent(this.editorChanged)
  }

  render() {
    h("div", {})

    const statusStyle = "padding: 2px; margin: 4px; " + (this.state.error ? "background-color: yellow;" : this.state.contentChanged ? "background-color: gray;" : "background-color: green;")

    return (
    <div class="function-sequencer-module">
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; justify-content: space-between; width: 100%">
          <button onClick={this.runPressed} style="padding: 2px; margin: 4px; background-color: rgb(16, 185, 129)">Save &amp; Run</button> 
          <div style={statusStyle}>
            { this.state.error != undefined ? this.state.error : this.state.contentChanged ? "Unsaved changes" : "Loaded" }
          </div>
        </div>
      </div>
      <div style="width: 100%; height: 100%; flex: 1;" ref={(ref) => this.setupEditor(ref)}>
      </div>

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