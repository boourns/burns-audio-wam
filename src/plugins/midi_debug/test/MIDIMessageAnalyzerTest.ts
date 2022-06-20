import { MIDIMessageAnalyzer } from "../src/MIDIMessageAnalyzer.js"
import { describe, it } from "mocha"
import { deepStrictEqual, strictEqual } from "assert"
import assert from "assert"

describe("MIDIMessageAnalyzer", () => {
    it("detects note on", () => {
        let a = new MIDIMessageAnalyzer([0x91, 0x32, 0x64])
    })
})
