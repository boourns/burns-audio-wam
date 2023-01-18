import { describe, it } from "mocha"
import assert, { deepStrictEqual, strictEqual } from "assert"
import {IntParameter} from "../../shared/midi/IntParameter.js"
import { ControlChangeMessager } from "../../shared/midi/ControlChangeMessager.js"
import {MicrokorgKernel} from "../src/MicrokorgKernel.js"
import { parseFragment } from "lib0/dom.js"

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
        const patch = new Uint8Array([240, 66, 48, 88, 64, 0, 32, 32, 32, 32, 32, 32, 32, 0, 32, 32, 32, 32, 32, 0, 0, 32, 7, 0, 64, 0, 60, 7, 40, 0, 97, 2, 101, 122, 2, 20, 64, 0, 15, 59, 0, 120, 0, 0, 80, 12, 1, 0, 127, 127, 112, 10, 64, 0, 66, 64, 64, 0, 0, 0, 0, 0, 0, 0, 71, 64, 0, 62, 0, 0, 0, 0, 79, 61, 46, 64, 1, 0, 127, 64, 0, 64, 64, 0, 30, 0, 0, 0, 0, 101, 109, 114, 2, 0, 10, 3, 2, 48, 12, 34, 105, 0, 3, 71, 66, 73, 71, 50, 0, 0, 0, 0, 0, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 0, 0, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 0, 0, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 127, 0, 112, 10, 64, 66, 64, 69, 0, 0, 0, 0, 0, 0, 0, 64, 64, 0, 0, 127, 0, 0, 1, 127, 20, 0, 64, 64, 64, 127, 64, 0, 64, 0, 64, 0, 64, 127, 0, 0, 64, 0, 127, 0, 2, 10, 3, 2, 70, 0, 12, 2, 64, 3, 64, 66, 64, 0, 67, 64, 0, 0, 0, 0, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 0, 0, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 0, 0, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 247])

        const kernel = new MicrokorgKernel()
        let result = kernel.fromSysex(0, patch)

        deepStrictEqual(kernel.parameters["arp_tempo"].value, 120)
    })

    it("Can generate sysex", async () => {
        const kernel = new MicrokorgKernel()
        let result = kernel.toSysex(0)
    })

    it("Sysex matches between read and write", () => {
        const kernel = new MicrokorgKernel()

        let startValues: Record<string, number> = {}

        for (let id of Object.keys(kernel.parameters)) {
            let wam = kernel.parameters[id].toWAM()
            kernel.parameters[id].value = wam.minValue! + Math.round(Math.random() * (wam.maxValue! - wam.minValue!))

            if (!id.startsWith("voc_")) {
                startValues[id] = kernel.parameters[id].value
            }
        }
        startValues["voice_mode"] = 1
        kernel.parameters["voice_mode"].value = 1

        const sysex = kernel.toSysex(0)

        const kernel2 = new MicrokorgKernel()
        assert(kernel2.fromSysex(0, sysex), "Failed to load sysex we generated!")

        let endValues: Record<string, number> = {}
        for (let id of Object.keys(kernel2.parameters)) {
            if (!id.startsWith("voc_")) {
                endValues[id] = kernel2.parameters[id].value
            }
        }

        deepStrictEqual(endValues, startValues)
    })

    it("sysex matches what comes from microkorg", () => {
        const input = new Uint8Array([240, 66, 48, 88, 64, 0, 32, 32, 32, 32, 32, 32, 32, 0, 32, 32, 32, 32, 32, 0, 0, 0, 7, 0, 64, 0, 60, 0, 24, 0, 0, 1, 26, 0, 0, 20, 69, 8, 15, 70, 0, 10, 64, 3, 100, 12, 1, 0, 126, 127, 120, 10, 64, 0, 66, 64, 64, 0, 0, 0, 0, 0, 0, 0, 64, 64, 0, 127, 0, 0, 0, 1, 14, 6, 90, 64, 112, 0, 127, 64, 0, 64, 50, 0, 41, 0, 5, 30, 0, 33, 101, 0, 2, 0, 10, 3, 2, 70, 12, 71, 99, 0, 7, 64, 66, 64, 67, 64, 0, 0, 0, 0, 0, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 0, 0, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 0, 0, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 127, 0, 112, 10, 64, 66, 64, 69, 0, 0, 0, 0, 0, 0, 0, 64, 64, 0, 0, 127, 0, 0, 1, 127, 20, 0, 64, 64, 64, 100, 64, 0, 64, 0, 64, 0, 64, 127, 0, 0, 64, 0, 127, 0, 2, 10, 3, 2, 70, 0, 12, 2, 64, 3, 64, 66, 64, 0, 67, 64, 0, 0, 0, 0, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 0, 0, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 0, 0, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 64, 64, 64, 64, 64, 0, 64, 64, 247])
        const kernel = new MicrokorgKernel()

        kernel.fromSysex(0, input)
        //let og = kernel.unpackKorg(input, 5, input.length-1)
        let og = input
        
        const output = kernel.toSysex(0)

        if (og.length != output.length) {
            throw new Error("generated sysex does not match length")
        }
        let correct = true
        for (let i = 0; i < input.length; i++) {
            if (og[i] != output[i]) {
                correct = false
                console.error("Mismatch, index=", i, "original= ", og[i], ", generated= ", output[i])
            }
        }
    })
})