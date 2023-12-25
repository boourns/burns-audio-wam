import { Component, h } from 'preact';
import { RandomizerNode, RandomizerRuleType } from '.';

import styleRoot from "./RandomizerView.scss"
import { RandomizerRuleView } from './RandomizerRule';

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export type RandomizerViewProps = {
    plugin: RandomizerNode
}

export class RandomizerView extends Component<RandomizerViewProps, any> {
    constructor() {
        super();
    }

    randomize() {
        this.props.plugin.randomize()
    }

    componentDidMount(): void {
        this.props.plugin.callback = () => { this.forceUpdate() }
    }

    componentWillUnmount(): void {
        this.props.plugin.callback = undefined
    }

    addRule() {
        this.props.plugin.rules.push({target: "", rule: RandomizerRuleType.doNotRandomize})
        this.forceUpdate()
    }

    render() {
        h("div", {})

        let disabled = !this.props.plugin.paramList

        if (this.props.plugin.extensionMissing) {
            return <div class={styles.Module}>
                To use this plugin, the WAM host must implement the 'modulationTarget' WAM extension.
            </div>
        }

        const rules = disabled ? [] : this.props.plugin.rules.map((r, i) => {
            return <RandomizerRuleView plugin={this.props.plugin} rule={r} index={i}></RandomizerRuleView>
        })

        return (
        <div class={styles.Module}>
            <div style="display: flex; flex-direction: row;">
                <div style="display: flex; flex-direction: column; padding-right: 6px;">
                    <button class={styles.DiceButton} disabled={disabled} onClick={() => this.randomize()}>🎲</button>
                </div>
                <div style="display: flex; flex-direction: column; flex: 1; width: 100%;">
                    <span>Rules</span>
                    <table>
                        <tr>
                            <th style="text-align: left;">Target</th>
                            <th style="text-align: left;">Rule</th>
                            <th></th>
                        </tr>
                        {rules}
                    </table>
                    <div>
                        <button style="margin: auto" onClick={() => this.addRule()}>+ Add Rule</button>
                    </div>
                </div>
            </div>
        </div>)
    }  
}