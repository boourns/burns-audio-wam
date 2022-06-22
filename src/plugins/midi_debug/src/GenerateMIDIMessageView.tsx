import { Component, h } from 'preact';
import { channelMessages } from './MIDIMessageAnalyzer';
import { MIDIDebugNode } from './Node';

export type HTMLInputEvent = Event & {target: HTMLInputElement }

export interface GenerateMIDIMessageProps {
    plugin: MIDIDebugNode
    onClose(): void
}

type GenerateMIDIMessageState = {
    messageType: number
    channel: number
    byte1: number,
    byte2: number
}

export class GenerateMIDIMessageView extends Component<GenerateMIDIMessageProps, GenerateMIDIMessageState> {
    constructor() {
        super()

        this.state = {
            messageType: 0x90,
            channel: 0,
            byte1: 32,
            byte2: 100
        }
    }

    sendMessage() {
        let midi: number[] = []
        midi.push(this.state.messageType + this.state.channel)
        midi.push(this.state.byte1)
        midi.push(this.state.byte2)

        this.props.plugin.emitMIDI(midi)
    }

    typeChanged(e: any) {
        this.setState({messageType: parseInt(e.target.value)})
    }

    valueChanged(param: string, e: any) {
        let update:Record<string, number> = {}
        update[param] = parseInt(e.currentTarget.value)
        this.setState(update)
    }

    render() {
        h("div", {})

        let actions = [            
            <button class="border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-sm" onClick={() => this.sendMessage()}>Send</button>,
            <button class="border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-sm" onClick={() => this.props.onClose()}>Close</button>
        ]

        let messageTypes = Object.keys(channelMessages).map(v => {
            return {value: parseInt(v), name: channelMessages[parseInt(v)].name}
        })

        let options = messageTypes.map(t => <option selected={t.value == this.state.messageType} value={t.value}>{t.name}</option>)

        return (
        <div>
            <div>
                <label>Message Type:
                    <select onChange={(e) => this.typeChanged(e)}>
                        {options}
                    </select>
                </label>
            </div>
            <div>
                <label>Channel:
                    <input placeholder="0-15" value={this.state.channel} onChange={(e) => this.valueChanged('channel', e)}></input>
                </label>
            </div>
            <div>
                <label>Byte 1:
                    <input value={this.state.byte1} onChange={(e) => this.valueChanged('byte1', e)}></input>
                </label>
            </div>
            <div>
                <label>Byte 2:
                    <input value={this.state.byte2} onChange={(e) => this.valueChanged('byte2', e)}></input>
                </label>
            </div>
            {actions}
        </div>
        )
    }
}