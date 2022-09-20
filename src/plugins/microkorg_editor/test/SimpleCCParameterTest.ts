import { describe, it } from "mocha"
import assert, { deepStrictEqual, strictEqual } from "assert"
import {SimpleCCParameter} from "../src/SimpleCCParameter.js"

const MIDI_CC = 0xB0
const MIDI_NOTE = 0x90

describe("SimpleCCParameter", () => {
    it("toWAM generates DynamicParameter config", async () => {
        const param = new SimpleCCParameter("cutoff", "Filter Cutoff", 15, 60, 0, 127)

        const wam = param.toWAM()
        
        deepStrictEqual(wam, {
                type: "int",
                defaultValue: 60,
                minValue: 0,
                maxValue: 127,
            }
        )
    })

    it("ingestMIDI ignores other MIDI messages", async () => {
        const param = new SimpleCCParameter("cutoff", "Filter Cutoff", 15, 60, 0, 127)

        // wrong channel
        param.ingestMIDI(0, {bytes:[MIDI_CC + 4, 15, 0]})

        strictEqual(param.automationMessage(), undefined)

        // wrong CC
        param.ingestMIDI(0, {bytes:[MIDI_CC + 0, 18, 0]})
        strictEqual(param.automationMessage(), undefined)

        // not a CC
        param.ingestMIDI(0, {bytes:[MIDI_NOTE + 0, 15, 80]})
        strictEqual(param.automationMessage(), undefined)
    })

    it("ingestMIDI ingests MIDI messages", async () => {
        const param = new SimpleCCParameter("cutoff", "Filter Cutoff", 15, 60, 0, 127)

        // correct, exact channel
        param.ingestMIDI(4, {bytes:[MIDI_CC + 4, 15, 40]})

        deepStrictEqual(param.automationMessage(), 
            {
                type: "wam-automation",
                data: {
                    id: "cutoff",
                    value: 40,
                    normalized: false,
                }
            }
        )

        // current channel set to OMNI (-1)
        param.ingestMIDI(-1, {bytes:[MIDI_CC + 4, 15, 70]})

        deepStrictEqual(param.automationMessage(), 
            {
                type: "wam-automation",
                data: {
                    id: "cutoff",
                    value: 70,
                    normalized: false,
                }
            }
        )

        // but if the value hasn't changed, no event generated
        param.ingestMIDI(-1, {bytes:[MIDI_CC + 4, 15, 70]})

        deepStrictEqual(param.automationMessage(), undefined)

    })
})
