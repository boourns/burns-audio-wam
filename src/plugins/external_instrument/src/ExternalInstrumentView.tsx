import { Component, h } from 'preact';
import { ExternalInstrumentNode } from '.';
import { DynamicParameterView } from "../../shared/DynamicParameterView"
import {EditInstrumentDefinitionView} from "./EditInstrumentDefinitionView"
import { InstrumentDefinition } from './InstrumentDefinition';

import styleRoot from "./ExternalInstrument.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export interface ExternalInstrumentProps {
  plugin: ExternalInstrumentNode
}

type ExternalInstrumentState = {
  panel: "GUI" | "EDIT"
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
    let newPanel: "EDIT" | "GUI"

    switch(this.state.panel) {
      case "GUI":
        newPanel = "EDIT"
        break
      case "EDIT":
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

  definitionUpdated(def: InstrumentDefinition) {
    this.props.plugin.instrumentDefinition = def
    this.props.plugin.updateProcessorFromDefinition()
  }

  renderEditor() {
    return <div style="width: 100%; height: 100%; flex: 1;">
      <EditInstrumentDefinitionView definition={this.props.plugin.instrumentDefinition} onUpdate={(def: InstrumentDefinition) => this.definitionUpdated(def)}></EditInstrumentDefinitionView>
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
      case "EDIT":
        panelLabel = "GUI"
        panel = this.renderEditor()
        break
      case "GUI":
        panelLabel = "Edit"
        panel = this.renderParameters()
        break
    }

    let result = (
    <div class={styles.module}>
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; flex-direction: row-reverse; justify-content: space-between; width: 100%">
          <div>
            <button onClick={this.panelPressed} class={styles.button}>{panelLabel}</button> 
          </div>
        </div>
      </div>
      {panel}
    </div>)

    return result
  }  
}