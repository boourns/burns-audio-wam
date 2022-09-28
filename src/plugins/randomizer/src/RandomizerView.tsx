import { Component, h } from 'preact';
import { Fader } from '../../shared/ui/Fader'
import { Select } from '../../shared/ui/Select'
import { Knob } from '../../shared/ui/Knob'

import RandomizerModule, { RandomizerNode } from '.';

import styleRoot from "./RandomizerView.scss"

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
        console.log("Calling randomize!")
        this.props.plugin.randomize()
    }

    componentDidMount(): void {
        this.props.plugin.callback = () => { this.forceUpdate() }
    }

    componentWillUnmount(): void {
        this.props.plugin.callback = undefined
    }

    render() {
        h("div", {})

        let disabled = !this.props.plugin.paramList

        return (
        <div class={styles.Module}>
            <button class={styles.DiceButton} disabled={disabled} onClick={() => this.randomize()}>🎲</button>
        </div>)
    }  
}