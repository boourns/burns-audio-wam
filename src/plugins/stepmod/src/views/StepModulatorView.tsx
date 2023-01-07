import { Component, h } from 'preact';


import StepModulatorModule from '..';
import { StepModulator } from '../StepModulator';
import { SequencerRowView } from './SequencerRowView';

import styleRoot from "./StepModulatorView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export type StepModulatorViewProps = {
    plugin: StepModulatorModule
    sequencer: StepModulator
    clipId: string
}

export class StepModulatorView extends Component<StepModulatorViewProps, any> {
    statePoller: number

    constructor() {
        super();
        this.pollState = this.pollState.bind(this)

        this.state = {
            "gain" : {value: 1.0},
            "slew" : {value: 1.0},
          }
    }

    componentDidMount() {
        this.pollState()

        this.props.sequencer.renderCallback = () => {
            this.forceUpdate()
        }
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(this.statePoller)

        this.props.sequencer.renderCallback = undefined
    }

    async pollState() {
        this.state = await this.props.plugin.audioNode.getParameterValues(false)

        this.statePoller = window.requestAnimationFrame(this.pollState)
    }

    render() {
        h("div", {})
        
        const rows = [
            <SequencerRowView clipId={this.props.clipId} node={this.props.plugin.audioNode} sequencer={this.props.sequencer}></SequencerRowView>
        ]

        return (
        <div class={styles.Module}>
            {rows}

            <div style="flex: 1"></div>
        </div>)
    }  
}