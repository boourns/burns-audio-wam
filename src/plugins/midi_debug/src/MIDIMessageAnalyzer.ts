enum MIDI_MESSAGE {
    NOTE_OFF = 0x80,
    NOTE_ON = 0x90,
    POLY_AFTERTOUCH = 0xA0,
    CONTROL_CHANGE = 0xb0,
    PROGRAM_CHANGE = 0xc0,
    CHANNEL_AFTERTOUCH = 0xD0,
    PITCHBEND = 0xe0
}

type MIDIMessageDescription = {
    name: string
    byte_names: string[]
}

export let channelMessages: Record<number, MIDIMessageDescription> = {
    0x90: {
        name: "note_on",
        byte_names: ["note", "velocity"],
    },
    0x80: {
        name: "note_off",
        byte_names: ["note", "velocity"],
    },
    0xb0: {
        name: "control change",
        byte_names: ["number", "value"],
    },
    0xc0: {
        name: "program change",
        byte_names: ["num", "num"],
    },
    0xd0: {
        name: "channel aftertouch",
        byte_names: ["value"]
    },
    0xe0: {
        name: "pitchbend",
        byte_names: ["msb", "lsb"],
    }
}

export class MIDIMessageAnalyzer {
    bytes: number[]

    constructor(bytes: number[]) {
        this.bytes = bytes
    }

    channelMessage(): boolean {
        return (this.bytes[0] & 0x80) !== 0x80
    }

    sysexMessage(): boolean {
        return (this.bytes[0] == 0xf0)
    }

    channel(): number | undefined {
        if (!this.channelMessage()) {
            return undefined
        } else {
            return this.bytes[0] & 0x0f
        }
    }

    description(): string[] {
        let result: string[] = []
        if (this.channelMessage()) {
            result.push(`ch: ${this.channel()+1}`)
            const type = this.bytes[0] & 0xf0
            let description = channelMessages[type]
            if (!description) {
                result.push("UNKNOWN")
            } else {
                result.push(`msg: ${description.name}`)
                description.byte_names.forEach((v, i) => {
                    result.push(`${v}: ${this.bytes[1 + i]}`)
                })
            }
        } else if (this.sysexMessage()) {
            result.push(`Sysex`)
        }

        return result
    }
    

}