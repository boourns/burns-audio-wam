export type RecordedMIDIMessage = {
	incoming: boolean
    timestamp: number
	bytes: number[]
}

export type MIDIRecordingState = {
    messages: RecordedMIDIMessage[]
}

export class MIDIRecording {
    messages: RecordedMIDIMessage[]

    constructor() {
        this.messages = []
    }

    clear() {
        this.messages = []
    }

    getState(): MIDIRecordingState {
        return {
            messages: [...this.messages.map(m => {
                return {
                    incoming: m.incoming,
                    timestamp: m.timestamp,
                    bytes: [...m.bytes]
                }
            })]
        }
    }

    setState(state: MIDIRecordingState) {
        this.messages = [...state.messages.map(m => {
            return {
                incoming: m.incoming,
                timestamp: m.timestamp,
                bytes: [...m.bytes]
            }
        })]
    }
}