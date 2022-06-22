import { Component, h } from 'preact';

import { Modal } from '../../shared/glow/layout/Modal'
import { Box } from '../../shared/glow/layout/Box'

import { MIDIDebugNode } from './Node';

export type HTMLInputEvent = Event & {target: HTMLInputElement }

export interface GenerateMIDIMessageProps {
    plugin: MIDIDebugNode
    onClose(): void
}

export class GenerateMIDIMessageView extends Component<GenerateMIDIMessageProps, any> {
    constructor() {
        super()
    }

    sendMessage() {
    }

    render() {
        h("div", {})

        let actions = [            
            <button class="border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-sm" onClick={() => this.sendMessage()}>Send</button>,
            <button class="border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-sm" onClick={() => this.props.onClose()}>Close</button>
        ]

        return (
        <Modal>
            <Box title="Generate MIDI Message" actions={actions}>
                <div>
                    <label>Quantize</label>
                </div>
            </Box>
        </Modal>
        )
    }
}