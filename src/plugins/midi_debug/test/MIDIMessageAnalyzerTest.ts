import { MIDIMessageAnalyzer } from "../src/MIDIMessageAnalyzer.js"
import { describe, it } from "mocha"
import { deepStrictEqual, strictEqual } from "assert"
import assert from "assert"

describe("MIDIMessageAnalyzer", () => {
    it("detects note on", () => {
        let noteOn = new MIDIMessageAnalyzer([0x91, 0x32, 0x64])
        assert(noteOn.channelMessage())
        strictEqual(noteOn.channel(), 1)
        deepStrictEqual(noteOn.description(), [
            'ch: 2',
            'msg: note_on',
            'note: 50',
            'velocity: 100'
        ])
    })
})
