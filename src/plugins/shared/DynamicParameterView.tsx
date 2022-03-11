import { Component, h } from "preact";
import { DynamicParamEntry, DynamicParameterNode, DynamicParamGroup } from "./DynamicParameterNode";
import { Knob } from "../shared/ui/Knob"

export interface DPProps {
    plugin: DynamicParameterNode
}

type DPState = {

}

export class DynamicParameterView extends Component<DPProps, DPState> {
    constructor() {
        super();
    }

    componentDidMount(): void {
        this.props.plugin.schemaUpdateCallback = () => {
            this.forceUpdate()
        }
    }

    componentWillUnmount(): void {
        this.props.plugin.schemaUpdateCallback = undefined
    }

    numberChanged(id: string, value: number) {
        this.props.plugin.pause = true

        console.log("state currently is ", this.props.plugin.state, id, value)

        this.props.plugin.state[id].value = value

        console.log("value is",  this.props.plugin.state[id].value)

        this.props.plugin.setParameterValues(this.state)
        this.props.plugin.pause = false

    }

    renderParam(p: DynamicParamEntry) {
        switch(p.config.type) {
            case "float":
                return <Knob onChange={(v) => this.numberChanged(p.id, v)} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.props.plugin.state[p.id].value}
                             label={p.config.label || p.id}
                             bipolar={p.config.minValue < 0}
                             >
                        </Knob>
            case "int":
                return <Knob onChange={(v) => this.numberChanged(p.id, Math.round(v))} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.props.plugin.state[p.id].value}
                             label={p.config.label || p.id}
                             bipolar={p.config.minValue < 0}
                             integer={true}
                             >
                        </Knob>           
                default:
                return <div>unknown!</div>
        }
    }

    renderGroup(group: DynamicParamGroup) {
        return <div style="display: flex; flex-direction: column;">
            {group.name}
            <div style="display: flex; flex-direction: row;">
                {group.params.map(p => this.renderParam(p))}
            </div>
        </div>
    }

    render() {
        let groups = this.props.plugin.groupedParameters

        return <div style="display: flex; flex-direction: column">
            {groups.map(g => this.renderGroup(g))}
        </div>
        
    }
}