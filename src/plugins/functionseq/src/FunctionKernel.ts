import { WamMidiData, WamParameterConfiguration, WamTransportData } from "@webaudiomodules/api";
import { NoteDefinition } from "wam-extensions";
import { FunctionAPI } from "./FunctionAPI";
import {FunctionSequencerProcessor} from "./FunctionSeqProcessor";
import { RemoteUIElement, ui } from "./RemoteUI";
import { RemoteUIController } from "./RemoteUIController";

type ParameterDefinition = {
    id: string
    config: WamParameterConfiguration
}

type FunctionSequencer = {
    /**
     * Called once when the processor has been loaded and is starting up.
     */
    init?(): void
    /**
     * Returns a list of parameters to expose to the host as automateable.  Also generates the UI controls.
     * @returns {ParameterDefinition[]} a list of parameters used to control the script
     */
    parameters?(): ParameterDefinition[]
    /**
     * Called 96 times per beat when the host transport is running. For example in 4/4 time, when ticks is divisible by 24, it is the start of a 16th note.
     * @param ticks {number} the number of ticks since host transport started.  
     * @param params {Record<string, number>} the current values of all registered parameters.
     */
    onTick?(ticks: number, params: Record<string, number>): void
    /**
     * Called when a MIDI event is received by this plugin.
     * @param event {number[]} the bytes of the MIDI event
     */
    onMidi?(event: number[]): void

    /**
     * Called when a downstream device updates the list of MIDI notes it responds to.  Especially useful for drum machines.
     * @param noteList {NoteDefinition[]} An optional list of MIDI note numbers, with names, supported by downstream MIDI devices
     */
    onCustomNoteList(noteList?: NoteDefinition[]): void
}

export class FunctionKernel {
    function: FunctionSequencer
    api: FunctionAPI
    transport: WamTransportData
    parameterIds: string[]
    processor: FunctionSequencerProcessor
    noteList?: NoteDefinition[]
    ui: RemoteUIController

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
        this.ui = new RemoteUIController(processor.port)
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
                this.function = new Function('api', 'ui', message.data.code)(this.api, ui)

                if (!!this.function.init) {
                    this.function.init()
                }

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
        } else if (message.data && message.data.action == "noteList") {
            this.noteList = message.data.noteList
            if (this.function && this.function.onCustomNoteList) {
                this.function.onCustomNoteList(message.data.noteList)
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
        if (this.function && this.function.onMidi) {
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