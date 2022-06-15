import { InstrumentKernel, InstrumentDefinition } from "../src/InstrumentDefinition.js"

import { describe, it } from "mocha"
import { deepStrictEqual } from "assert"

describe("InstrumentKernel", () => {
    it("toWAM generates DynamicParameter config", async () => {
        const def: InstrumentDefinition = {
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

        const kernel = new InstrumentKernel(def)

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
})
