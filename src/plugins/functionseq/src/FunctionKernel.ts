import { WamMidiData, WamParameterConfiguration, WamTransportData } from "@webaudiomodules/api";
import { FunctionAPI } from "./FunctionAPI";
import {FunctionSequencerProcessor} from "./FunctionSeqProcessor";

type ParameterDefinition = {
    id: string
    config: WamParameterConfiguration
}

type FunctionSequencer = {
    init?(): void
    parameters?(): ParameterDefinition[]
    onTick?(ticks: number, params: Record<string, number>): void
    onMidi?(event: number[]): void
}

export class FunctionKernel {
    function: FunctionSequencer
    api: FunctionAPI
    transport: WamTransportData
    parameterIds: string[]
    processor: FunctionSequencerProcessor

    constructor(processor: FunctionSequencerProcessor) {
        this.api = new FunctionAPI(processor.port, this)

        this.parameterIds = []
        this.processor = processor
    }

    onTick(ticks: number, params: Record<string, number>) {
        if (!this.function) {
            return
        }

        try {
            if (this.function.onTick) {
                this.function.onTick(ticks, params)
            }
        } catch (e) {
            this.processor.port.postMessage({source: "functionSeq", action:"error", error: e.toString()})
            this.function = undefined
        }
    }

    /**
     * Messages from main thread appear here.
     * @param {MessageEvent} message
     */
     async onMessage(message: any): Promise<void> {
        if (message.data && message.data.action == "function") {
            try {
                this.function = new Function('api', message.data.code)(this.api)

                if (!!this.function.parameters) {
                    let parameters = this.function.parameters()

                    let map: Record<string, WamParameterConfiguration> = {}
                    this.parameterIds = []

                    for (let p of parameters) {
                        this.validateParameter(p)

                        map[p.id] = p.config
                        this.parameterIds.push(p.id)
                    }

                    this.processor.port.postMessage({source: "functionSeq", action:"newParams", params: parameters})

                    this.processor.updateParameters(map)
                } else {
                    console.warn("parameters() function missing, sequencer has no parameters.")
                }
            } catch(e) {
                this.processor.port.postMessage({source: "functionSeq", action:"error", error: e.toString()})
                this.function = undefined
            }
        } else {
            // @ts-ignore
            super._onMessage(message)
        }
    }

    onTransport(transportData: WamTransportData) {
        this.transport = transportData
    }

    onMidi(event: WamMidiData) {
        console.log("Kernel onMidi ", event)
        if (this.function && this.function.onMidi) {
            console.log("onMidi defined by function")
            this.function.onMidi(event.bytes)
        }
    }

    validateParameter(p: ParameterDefinition) {
        if (p.id === undefined || p.config === undefined) {
            throw new Error(`Invalid parameter ${p}: must have id and config defined`)
        }
        if (p.id.length == 0) {
            throw new Error("Invalid parameter: id must be string and not blank")
        }
        if (['float', 'int', 'boolean','choice'].findIndex(t => t == p.config.type) == -1) {
            throw new Error(`Invalid parameter type ${p.config.type}`)
        }
    }

}