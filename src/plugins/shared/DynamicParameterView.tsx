import { Component, h } from "preact";
import { DynamicParamEntry, DynamicParameterNode, DynamicParamGroup } from "./DynamicParameterNode";
import { Knob } from "../shared/ui/Knob"
import { Select } from "../shared/ui/Select"
import { WamParameterData, WamParameterDataMap } from "@webaudiomodules/api";

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

    valueChanged(id: string, value: number) {
        this.props.plugin.pause = true

        this.props.plugin.state[id].value = value

        let update: WamParameterDataMap = {}
        update[id] = this.props.plugin.state[id]

        this.props.plugin.setParameterValues(update)
        this.props.plugin.pause = false

    }

    getValue(param: DynamicParamEntry) {
        if (this.props.plugin.state && this.props.plugin.state[param.id]) {
            let entry = this.props.plugin.state[param.id]
            if (entry.value !== undefined) {
                return entry.value
            }
        }

        return param.config.defaultValue
    }

    renderParam(p: DynamicParamEntry) {
        switch(p.config.type) {
            case "float":
                return <Knob onChange={(v) => this.valueChanged(p.id, v)} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.getValue(p)}
                             label={p.config.label || p.id}
                             bipolar={p.config.minValue < 0}
                             color="var(--var-RangeDefault)"
                             >
                        </Knob>
            case "int":
                return <Knob onChange={(v) => this.valueChanged(p.id, Math.round(v))} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.getValue(p)}
                             label={p.config.label || p.id}
                             bipolar={p.config.minValue < 0}
                             integer={true}
                             color="var(--var-RangeDefault)"
                             >
                        </Knob>
            case "boolean":
                return <Select onChange={(v) => this.valueChanged(p.id, parseInt(v))}
                               options={["off", "on"]}
                               value={() => this.getValue(p)}
                               label={p.config.label || p.id}
                    >
                </Select>
            case "choice":
                return <Select onChange={(v) => this.valueChanged(p.id, parseInt(v))}
                               options={p.config.choices}
                               value={() => this.getValue(p)}
                               label={p.config.label || p.id} />
                               
            default:
                return <div>unknown!</div>
        }
    }

    renderGroup(group: DynamicParamGroup) {
        return <div style="display: flex; flex-direction: column; margin: 10px; border: 1px solid black; border-radius: 1%; padding: 5px;">
            <b>{group.name}</b>
            <div style="display: flex; flex-direction: row; margin: 5px;">
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