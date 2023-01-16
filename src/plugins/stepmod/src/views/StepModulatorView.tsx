import { WamParameterData } from '@webaudiomodules/api';
import { Component, h, Fragment } from 'preact';


import StepModulatorModule from '..';
import { StepModulator } from '../StepModulator';
import { SequencerRowView } from './SequencerRowView';

import styleRoot from "./StepModulatorView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export type StepModulatorViewProps = {
    plugin: StepModulatorModule
    clipId: string
}

export class StepModulatorView extends Component<StepModulatorViewProps, any> {
    statePoller: number
    paramState: Record<string, WamParameterData>

    constructor() {
        super();
        this.pollState = this.pollState.bind(this)
        this.paramState = {}
    }

    componentDidMount() {
        this.pollState()

        this.props.plugin.audioNode.renderCallback = () => {
            this.forceUpdate()
        }
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(this.statePoller)

        this.props.plugin.audioNode.renderCallback = undefined
    }

    async pollState() {
        this.paramState = await this.props.plugin.audioNode.getParameterValues(false)

        this.statePoller = window.requestAnimationFrame(this.pollState)
    }

    paramChanged(name: string, value: number) {
        if (!this.paramState[name]) {
            this.paramState[name] = {
                id: name, 
                normalized: false,
                value
            }
        }

        this.paramState[name].value = value
        this.props.plugin.audioNode.setParameterValues(this.paramState) 
    }

    render() {
        h("div", {})
        
        const rows = this.props.plugin.audioNode.sequencerOrder.map((id, index) => {
            return <SequencerRowView row={index} parent={this} clipId={this.props.clipId} node={this.props.plugin.audioNode} sequencer={this.props.plugin.audioNode.sequencers[id]}></SequencerRowView>
        })

        return <>
            <div class={styles.Module}>
                {rows}
                <div>
                    <button onClick={() => this.props.plugin.audioNode.addRow()}>+ Add Row</button>
                </div>

                <div style="flex: 1"></div>
            </div>
            <style>
                {this.props.plugin.audioNode.themeCss}
            </style>
        </>
    }
}