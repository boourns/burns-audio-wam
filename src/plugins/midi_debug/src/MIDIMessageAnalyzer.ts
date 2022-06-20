let MESSAGE_TYPE = {
    0x90: "note_on",
    0x80: "note_off",
    0xb0: "cc",
    0xa0: "poly aftertouch",
    0xc0: "program change",
    0xd0: "channel aftertouch",
    0xe0: "pitchbend",
}

export class MIDIMessageAnalyzer {
    msg: number[]

    constructor(msg: number[]) {
        this.msg = msg
    }

    

}