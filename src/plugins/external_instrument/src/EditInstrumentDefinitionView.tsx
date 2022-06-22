import { Component, h } from "preact";
import { InstrumentDefinition } from "./InstrumentDefinition";
import styles from "./EditInstrumentDefinitionView.scss"

export interface EditInstrumentDefinitionProps {
    definition: InstrumentDefinition
    onUpdate: (definition: InstrumentDefinition) => void
}

export class EditInstrumentDefinitionView extends Component<any, any> {
    constructor() {
        super()
    }

    render() {
        return <div class={styles.blah}>

        </div>
    }
}