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
    onClose(): void
    onChange(): void
    clip: Clip
}

export class ClipSettingsView extends Component<ClipSettingsProps, any> {
    constructor() {
        super()
    }

    quantizeChanged(value: string) {
        this.props.clip.quantize = parseInt(value)
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

        let actions = [            
            <button class="border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-sm" onClick={() => this.clearClip()}>Clear Clip</button>,
            <button class="border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-sm" onClick={() => this.props.onClose()}>Close</button>
        ]

        return (
        <div>
            <div class="flex my-1">
                <label>Quantize</label>
                <Select style="flex-direction: row-reverse;" options={quantizeOptions} values={quantizeValues} value={() => this.props.clip.quantize} onChange={(e) => this.quantizeChanged(e)} />
            </div>
            <div class="flex my-1 justify-between">
                <label>Clip Length (bars)</label>
                <TextInput className="w-20" value={bars} onChange={(e) => this.lengthChanged(e)} />
            </div>
            {actions}
        </div>
        )
    }
}