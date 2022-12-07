import { WamMidiData, WamParameterConfiguration, WamTransportData } from "@webaudiomodules/api";
import { NoteDefinition } from "wam-extensions";
import { FunctionAPI } from "./FunctionSequencer";
import {FunctionSequencerProcessor} from "./FunctionSeqProcessor";
import { ui } from "./RemoteUI";
import { RemoteUIController } from "./RemoteUIController";
import * as tonal from "tonal"
import { FunctionSequencer, ParameterDefinition } from "./FunctionSequencer";

export class FunctionKernel {
    function: FunctionSequencer
    api: FunctionAPI
    transport: WamTransportData
    parameterIds: string[]
    processor: FunctionSequencerProcessor
    noteList?: NoteDefinition[]
    ui: RemoteUIController
    additionalState: Record<string, any>
    additionalStateDirty: boolean

    constructor(processor: FunctionSequencerProcessor) {
        this.api = new FunctionAPI()
        this.transport = {
            tempo: 120,
            timeSigDenominator: 4,
            timeSigNumerator: 4,
            playing: false,
            currentBar: 0,
            currentBarStarted: 0
        }

        this.parameterIds = []
        this.processor = processor
        this.additionalState = {}
        this.additionalStateDirty = false

        this.ui = new RemoteUIController(this, processor.port)
    }

    onTick(ticks: number, params: Record<string, number>) {
        if (!this.function) {
            return
        }

        try {
            if (this.function.onTick) {
                this.function.onTick(ticks, params)
            }

            this.flush()
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
                this.function = new Function('api', 'ui', 'tonal', message.data.code)(this.api, ui, tonal)

                if (!!this.function.init) {
                    this.function.init()
                }
            } catch(e) {
                this.error(`Error initializing function: ${e}`)
            }
            this.flush()
        } else if (message.data && message.data.action == "noteList") {
            this.noteList = message.data.noteList
            if (this.function && this.function.onCustomNoteList) {
                this.function.onCustomNoteList(message.data.noteList)
            }
            this.flush()
        } else if (message.data && message.data.action == "additionalState") {
            this.additionalState = message.data.state
            this.additionalStateDirty = true
            this.flush()
        } else {
            // @ts-ignore
            super._onMessage(message)
        }
    }

    onTransport(transportData: WamTransportData) {
        try {
            if (this.transport && this.function) {
                if (this.transport.playing && !transportData.playing) {
                    if (this.function.onTransportStop) {
                        this.function.onTransportStop(transportData)
                    }
                } else if (!this.transport.playing && transportData.playing) {
                    if (this.function.onTransportStart) {
                        this.function.onTransportStart(transportData)
                    }
                }
                this.flush()
                
                this.transport = transportData
            }
        } catch (e) {
            this.error(`Error in onTransport: ${e}`)
        }
    }

    onMidi(event: WamMidiData) {
        if (this.function && this.function.onMidi) {
            try {
                this.function.onMidi(event.bytes)
                this.flush()
            } catch (e) {
                this.error(`Error in onMidi: ${e}`)
            }
        }
    }

    onAction(name: string) {
        if (this.function && this.function.onAction) {
            try {
                this.function.onAction(name)
                this.flush()
            } catch (e) {
                this.error(`Error in onAction: ${e}`)
            }
        }
    }

    onStateChange() {
        if (this.function && this.function.onStateChange) {
            try {
                this.function.onStateChange({...this.additionalState})
                this.flush()
            } catch (e) {
                this.error(`Error in onAction: ${e}`)
            }
        }
    }

    registerParameters(parameters: ParameterDefinition[]) {
        let map: Record<string, WamParameterConfiguration> = {}
        this.parameterIds = []

        for (let p of parameters) {
            this.validateParameter(p)

            map[p.id] = p.config
            this.parameterIds.push(p.id)
        }

        this.processor.port.postMessage({source: "functionSeq", action:"newParams", params: parameters})

        this.processor.updateParameters(map)
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

    setAdditionalState(name: string, value: any) {
        this.additionalState[name] = value
        this.additionalStateDirty = true
    }

    getAdditionalState(name: string) {
        return this.additionalState[name]
    }

    error(e: any) {
        this.processor.port.postMessage({source: "functionSeq", action:"error", error: e.toString()})
        this.function = undefined
    }

    flush() {
        this.ui.flush()
        if (this.additionalStateDirty) {
            this.additionalStateDirty = false
            this.processor.port.postMessage({source: "functionSeq", action:"additionalState", state: this.additionalState})
            this.onStateChange()
        }
    }
} 