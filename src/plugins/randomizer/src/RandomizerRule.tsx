import { Component, h } from "preact";
import { RandomizerNode, RandomizerRule } from ".";

export interface RuleProps {
    plugin: RandomizerNode
    rule: RandomizerRule
    index: number
}

export class RandomizerRuleView extends Component<RuleProps, any> {
    targetChanged(e: any) {
        this.props.plugin.rules[this.props.index].target = e.target.value
    }

    render() {
        let options = Object.keys(this.props.plugin.paramList).map(p => {
            return <option value={p} selected={p == this.props.rule.target}>{p}</option>
        })

        options.unshift(<option value="">--</option>)

        return <tr>
            <td><select onChange={(e) => this.targetChanged(e)}>{options}</select></td>
            <td>Do not randomize</td>
            <button onClick={() => this.props.plugin.deleteRule(this.props.index)}>X</button>
        </tr>
    }
}