import { WamParameterConfiguration, WamTransportData } from "@webaudiomodules/api"
import { AudioWorkletGlobalScope } from "@webaudiomodules/api"
import { FunctionKernel } from "./FunctionKernel"
import { MIDI } from "./FunctionSeqProcessor"
import { RemoteUI } from "./RemoteUI"

const PPQN = 96

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope

export type ParameterDefinition = {
    id: string
    config: WamParameterConfiguration
}

export type FunctionSequencer = {
    /**
     * Called once when the processor has been loaded and is starting up.
     * This is a good place to call api.RegisterParameters and ui.Register
     */
    init?(): void

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
     * Called when the host transport changes.
     * @param transport {WamTransportData} the transport state, including tempo, time signature, and playing state
     */
    onTransportStart?(transport: WamTransportData): void

    /**
     * Called when the host transport changes.
     * @param transport {WamTransportData} the transport state, including tempo, time signature, and playing state
     */
    onTransportStop?(transport: WamTransportData): void

    /**
     * Called when an 'action' button has been pressed.
     * @param name {string} the name of the registered action that has been pressed
     */
    onAction?(name: string): void

    /**
     * Called after a state value was changed via `setState()`, possibly by another collaborator.
     * @param state {Record<string, any>} the complete state
     */
    onStateChange?(state: Record<string, any>): void

    /**
     * Called when a downstream device updates the list of MIDI notes it responds to.  Especially useful for drum machines.
     * @param noteList {NoteDefinition[]} An optional list of MIDI note numbers, with names, supported by downstream MIDI devices
     */
    onCustomNoteList(noteList?: NoteDefinition[]): void
}

export type NoteDefinition = {
    number: number
    name?: string
    blackKey: boolean
}

export class FunctionAPI {
    #ui: RemoteUI
    #kernel: FunctionKernel

    constructor(ui: RemoteUI, kernel: FunctionKernel) {
        this.#ui = ui
        this.#kernel = kernel
    }
    
    /**
     * emits a MIDI Note on message followed by a MIDI Note off message delayed by the duration
     * @param note {number} the MIDI note number, from 0-127
     * @param velocity {number} MIDI note on velocity, from 0-127
     * @param duration {number} the midi note duration, in seconds.
     * @param startTime {number} optionally set the starting time of the note, in relation to api.getCurrentTime()
     * */
    emitNote(note: number, velocity: number, duration: number, startTime?: number) {
        if (startTime === undefined) {
            startTime = audioWorkletGlobalScope.currentTime
        }

        this.emitMidiEvent([MIDI.NOTE_ON, note, velocity], startTime)
        this.emitMidiEvent([MIDI.NOTE_OFF, note, velocity], startTime+duration)
    }

    emitMidiEvent(bytes: number[], eventTime: number) {
        if (bytes.length > 3) {
            throw "emitMidiEvent can only emit regular MIDI messages - use emitSysex to emit sysex messages."
        }
        for (let i = 0; i < bytes.length; i++) {
            if (!Number.isInteger(bytes[i]) || bytes[i] < 0 || bytes[i] > 255) {
                throw `MIDI event byte at index ${i} is not an integer between 0-255, is ${bytes[i]}`
            }
        }
        this.#kernel.processor.emitEvents(
            { type: 'wam-midi', time: eventTime, data: { bytes } }
        )
    }

    /**
     * returns the current time
     * @returns {number} the current audioContext time, in seconds
     */
    getCurrentTime(): number {
        return audioWorkletGlobalScope.currentTime
    }

    /**
     * returns the duration, in seconds, for the input number of ticks
     * @param ticks {number} the number of ticks to convert to seconds
     */
    getTickDuration(ticks: number): number {
        return ticks * 1.0 / ((this.#kernel.transport.tempo / 60.0) * PPQN);
    }

    /**
     * Set (or unset) a list of named MIDI notes.  Used to inform earlier MIDI processors what MIDI notes are valid.
     * @param noteList {NoteDefinition[]} a list of midi notes this processor accepts.  Set to undefined to clear the custom note list.
     */
    setCustomNoteList(noteList?: NoteDefinition[]) {
        this.#kernel.processor.port.postMessage({source: "functionSeq", action:"noteList", noteList})
    }

    /**
     * Register the complete list of plugin parameters.  These parameters can be mapped to UI controls and are exposed to the host for automation.
     * @param parameters {ParameterDefinition[]} the list of parameters to register for the plugin.
     */
    registerParameters(parameters: ParameterDefinition[]) {
        this.#kernel.registerParameters(parameters)
    }

    /**
     * Stores an additional variable into the patch.  This gets sent to other collaborators and will be restored after refreshing the page.
     * Be warned: this is an expensive operation as the value change is sent to the server and all other users.  Only use this function
     * to hold state that is not in a registered parameter (which are automatically synced to the server).
     * Calling setState() will result in your onStateChange() callback running on all plugin instances including locally.
     * @param name {string} the variable name
     * @param value {any} the value to store
     */
    setState(name: string, value: any) {
        this.#kernel.setAdditionalState(name, value)
    }

    /**
     * Returns the stored value for a variable name that was previously stored with setState.
     * @param name {string} the variable name to return
     * @returns {any} the previously stored value, or undefined if nothing is stored.
     */
    getState(name: string) {
        return this.#kernel.getAdditionalState(name)
    }
}