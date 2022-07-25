import getInstrumentKernel, {InstrumentDefinition} from "../src/InstrumentDefinition.js"

import { describe, it } from "mocha"
import assert, { deepStrictEqual, strictEqual } from "assert"

const InstrumentKernel = getInstrumentKernel("test")

const definition: InstrumentDefinition = {
    controlGroups: [
        {
            label: "Group1",
            controls: [
                {
                    id: "pan",
                    label: "Pan",
                    data: {
                        dataType: "CC",
                        ccNumber: 7,
                        minValue: 0,
                        maxValue: 127,
                        defaultValue: 64
                    }
                }
            ]
        }
    ]
}

describe("InstrumentKernel", () => {
    it("toWAM generates DynamicParameter config", async () => {
        const kernel = new InstrumentKernel(definition, 0)

        let dpp = kernel.toWAM()
        deepStrictEqual(dpp, [
            {
                name: 'Group1',
                params: [
                    {
                        config: {
                            defaultValue: 64,
                            maxValue: 127,
                            minValue: 0,
                            type: 'int'
                        },
                        id: 'pan'
                    }
                ]
            }
        ])
    })

    it("emitEvents generates new MIDI events for changed parameters", async () => {
        const kernel = new InstrumentKernel(definition, 0)

        let events = kernel.emitEvents({pan: 0})

        deepStrictEqual(events, [
            {
                "type": "wam-midi",
                "data": {"bytes": [0xB0,7,0]}
            }
        ])

        events = kernel.emitEvents({pan: 0})

        deepStrictEqual(events, [])

        events = kernel.emitEvents({pan: 42})

        deepStrictEqual(events, [
            {
                "type": "wam-midi",
                "data": {"bytes": [0xB0,7,42]}
            }
        ])

    })

    it("inherits previous iteration's values to avoid duplicating MIDI events", async () => {
        const parent = new InstrumentKernel(definition, 0)

        let events = parent.emitEvents({pan: 0})

        deepStrictEqual(events, [
            {
                "type": "wam-midi",
                "data": {"bytes": [0xB0,7,0]}
            }
        ])

        const kernel = new InstrumentKernel(definition, 0, parent)

        events = kernel.emitEvents({pan: 0})

        deepStrictEqual(events, [])        
    })

    it("ingests MIDI CC messages in learn mode", async () => {
        const kernel = new InstrumentKernel(definition, 0)

        const result = kernel.ingestMidi({bytes: [0xB0, 8, 55]})

        deepStrictEqual(result, [
            "port",
            {
                source: "kernel",
                type: "learn",
                data: {
                    cc: 8,
                    value: 55
                }
            }
        ])
    })

    it("updates Parameter value for existing CC", async () => {
        const kernel = new InstrumentKernel(definition, 0)

        const result = kernel.ingestMidi({bytes: [0xB0, 7, 55]})

        deepStrictEqual(result, [
            "wam",
            {
                type: "wam-automation",
                data: {
                    id: "pan",
                    value: 55,
                    normalized: false
                }
            }
        ])
    })
})
