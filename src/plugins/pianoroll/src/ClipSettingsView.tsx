import { Component, h } from 'preact';
import { Clip } from './Clip';

import { Select } from '../../shared/ui/Select'
import { TextInput } from '../../shared/ui/TextInput'

export type HTMLInputEvent = Event & {target: HTMLInputElement }

let quantizeOptions = [
    "off",
    "1/32",
    "1/16",
    "1/8",
    "1/4",
    "1 bar"
]

let quantizeValues = [
    1,
    3,
    6,
    12,
    24,
    96
]

export interface ClipSettingsProps {
    onChange(): void
    clip: Clip
}

export class ClipSettingsView extends Component<ClipSettingsProps, any> {
    constructor() {
        super()
    }

    quantizeChanged(value: string) {
        this.props.clip.setQuantize(parseInt(value))
        this.props.onChange()
    }

    lengthChanged(e: HTMLInputEvent) {
        var length = parseInt(e.target.value)
        
        if (isNaN(length) || length < 1) {
            length = 1
        }

        let state = this.props.clip.getState()
        state.length = (length * 96)
        this.props.clip.setState(state)
        this.props.onChange()
    }

    clearClip() {
        let state = this.props.clip.getState()
        state.notes = []
        this.props.clip.setState(state)
        this.props.onChange()
    }

    render() {
        h("div", {})

        let bars = this.props.clip.state.length / 96;

        return (
        <div style="background-color: lightgray; padding: 5px; z-index: 2;">
            <div style="display: flex; align-items: center">
                <label>Quantize</label>
                <Select style="flex-direction: row-reverse;" options={quantizeOptions} values={quantizeValues} value={() => this.props.clip.quantize} onChange={(e) => this.quantizeChanged(e)} />
            </div>
            <div style="padding-top: 4px; padding-bottom: 4px;">
                <label>Clip Length (bars)</label>
                <TextInput value={bars} onChange={(e) => this.lengthChanged(e)} />
            </div>
        </div>
        )
    }
}