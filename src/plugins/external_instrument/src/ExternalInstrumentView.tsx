import { Component, h } from 'preact';
import { ExternalInstrumentNode } from '.';
import { DynamicParameterView } from "../../shared/DynamicParameterView"

export interface ExternalInstrumentProps {
  plugin: ExternalInstrumentNode
}

type ExternalInstrumentState = {
  panel: "GUI" | "CODE"
  runCount: number
}

export class ExternalInstrumentView extends Component<ExternalInstrumentProps, ExternalInstrumentState> {
  statePoller: number
  ref: HTMLDivElement | null

  constructor() {
    super();
    this.state = {
      panel: "GUI",
      runCount: 0
    }

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
    this.props.plugin.renderCallback = undefined
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
    <div class="function-sequencer-module">
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; justify-content: space-between; width: 100%">
          <div>
            <button onClick={this.panelPressed} style="padding: 2px; margin: 4px; background-color: rgb(16, 185, 129)">{panelLabel}</button> 
          </div>

          <div style={statusStyle}>
            { this.props.plugin.error != undefined ? this.props.plugin.error.toString() : "Running" }
          </div>
        </div>
      </div>
      {panel}
      <style>
        {this.css()}
      </style>
    </div>)

    return result
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