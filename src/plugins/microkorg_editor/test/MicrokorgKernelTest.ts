import { describe, it } from "mocha"
import assert, { deepStrictEqual, strictEqual } from "assert"
import {IntParameter} from "../src/IntParameter.js"
import { ControlChangeMessager } from "../src/ControlChangeMessager.js"
import {MicrokorgKernel} from "../src/MicrokorgKernel.js"

describe("MicrokorgKernel", () => {
    it("packKorg packs bytes", async() => {
        const input = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff]
        const kernel = new MicrokorgKernel()
        const packed = kernel.packKorg(input)

        deepStrictEqual(packed, [63, 127, 127, 127,
            127, 127, 127, 127,
              7, 127, 127, 127])
    })

    it("unpackKorg unpacks sysex bytes", async () => {
        const input = [63, 127, 127, 127,
            127, 127, 127, 127,
              7, 127, 127, 127]

        const kernel = new MicrokorgKernel()

        const unpacked = kernel.unpackKorg(new Uint8Array(input), 0)

        deepStrictEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff], unpacked)

    })

    it("Can load sysex", async () => {
        const patch = new Uint8Array([240, 66, 48, 88, 64, 0, 32, 32, 32, 32, 32, 32, 32, 0, 32, 32, 32, 32, 32, 0, 0, 32, 7, 0, 64, 0, 60, 7, 40, 0, 85, 2, 20, 30, 0, 16, 76, 0, 15, 61, 0, 120, 0, 0, 80, 8, 1, 0, 0, 127, 112, 10, 64, 0, 66, 64, 65, 3, 15, 0, 0, 0, 0, 2, 64, 73, 0, 127, 100, 0, 3, 1, 57, 30, 70, 64, 64, 0, 127, 64, 0, 64, 64, 0, 64, 0, 0, 95, 2, 64, 127, 114, 2, 0, 10, 3, 2, 70, 12, 2, 71, 0, 71, 54, 3, 66, 67, 64, 0, 0, 0, 0, 0, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 0, 0, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 0, 0, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 127, 0, 112, 10, 64, 66, 64, 69, 0, 0, 0, 0, 0, 0, 0, 64, 64, 0, 0, 127, 0, 0, 1, 127, 20, 0, 64, 64, 64, 127, 64, 0, 64, 0, 64, 0, 64, 127, 0, 0, 64, 0, 127, 0, 2, 10, 3, 2, 70, 0, 12, 2, 64, 3, 64, 66, 64, 0, 67, 64, 0, 0, 0, 0, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 0, 0, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 0, 0, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 247])

        const kernel = new MicrokorgKernel()
        let result = kernel.fromSysex(patch)

    })

    it("Can generate sysex", async () => {
        const kernel = new MicrokorgKernel()
        let result = kernel.toSysex()
        
        console.log("result length ", result.length)
    })
})