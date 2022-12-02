export function defaultScript(): string {
    return `
// Write a MIDI sequencer in pure ES6 javascript.
// Press "Run" to load changes.  This also distributes changes to other users.
// It is loaded directly into the browser's audio thread, no transpilation occurs.
// For better error reporting check your console.

// To make a sequencer, at the end of the script return an object that responds to
// the onTick method.  This is run in the audio thread, not the main thread.

/** 
 * @class
 * @implements {FunctionSequencer}
 * */
class RandomNoteSequencer {
    /**
     * @param {FunctionAPI} api
     * */
    constructor(api) {
        this.api = api
    }

    /**
     * @returns {WAMParameterDefinition[]}
     */
    parameters() {
        return [
            {
                id: "base",
                config: {
                    label: "Base Note",
                    type: "int",
                    defaultValue: 32,
                    minValue: 0,
                    maxValue: 100
                }
            },
            {
                id: "range",
                config:{
                    label: "Note Range",
                    type: "int",
                    defaultValue: 24,
                    minValue: 1,
                    maxValue: 48    
                }
            }
        ]
    }

    /**
     * @param {number} tick
     * @param {Record<string, number>} params
     * */
    onTick(tick, params) {
        // onTick is called once every sequencer tick, which is 96 PPQN
        // it returns an array of {note, velocity, duration}
        // where note is the MIDI note number, velocity is an integer from 0 to 127, and duration is the length of the note in ticks.

        if (tick % 24 == 0) {
            this.api.emitNote(params.base + Math.floor(Math.random() * params.range), 100, 10);
        }
    }

    /** 
     * onMidi is called when a MIDI message is sent to the FunctionSeq instance.
     * @param bytes {number[]}
     * */
    onMidi(bytes) {
        
    }
}

return new RandomNoteSequencer(api)
`
}

export function editorDefinition(): string {
    return `
declare type MIDINote = {
    /** MIDI Note number, 0-127 */
    note: number
    /** Note velocity, 0: off, 1-127: note on strength */
    velocity: number
    /** Note duration, measured in sequencer ticks (24 PPQN) */
    duration: number
}

declare type WAMParameterDefinition = {
    /** An identifier for the parameter, unique to this plugin instance */
    id: string
    /** The parameter's human-readable name. */
    label?: string
    /** The parameter's data type */
    type?: "float" | "int"
    /** The default value for the parameter */
    defaultValue: number
    /** The lowest possible value for the parameter */
    minValue?: number
    /** The highest possible value for the parameter */
    maxValue?: number
}

declare type ParameterDefinition = {
    id: string;
    config: WamParameterConfiguration;
};

declare type FunctionSequencer = {
    /**
     * Called once when the processor has been loaded and is starting up.
     */
    init?(): void;
    /**
     * Returns a list of parameters to expose to the host as automateable.  Also generates the UI controls.
     * @returns {ParameterDefinition[]} a list of parameters used to control the script
     */
    parameters?(): ParameterDefinition[];
    /**
     * Called 96 times per beat when the host transport is running. For example in 4/4 time, when ticks is divisible by 24, it is the start of a 16th note.
     * @param ticks {number} the number of ticks since host transport started.
     * @param params {Record<string, number>} the current values of all registered parameters.
     */
    onTick?(ticks: number, params: Record<string, number>): void;
    /**
     * Called when a MIDI event is received by this plugin.
     * @param event {number[]} the bytes of the MIDI event
     */
    onMidi?(event: number[]): void;
    /**
     * Called when a downstream device updates the list of MIDI notes it responds to.  Especially useful for drum machines.
     * @param noteList {NoteDefinition[]} An optional list of MIDI note numbers, with names, supported by downstream MIDI devices
     */
    onCustomNoteList(noteList?: NoteDefinition[]): void;
};

declare type NoteDefinition = {
    number: number;
    name?: string;
    blackKey: boolean;
};

declare class FunctionAPI {
    /**
     * emits a MIDI Note on message followed by a MIDI Note off message delayed by the duration
     * @param note {number} the MIDI note number, from 0-127
     * @param velocity {number} MIDI note on velocity, from 0-127
     * @param duration {number} the midi note duration, in seconds.
     * @param startTime {number} optionally set the starting time of the note, in relation to api.getCurrentTime()
     * */
    emitNote(note: number, velocity: number, duration: number, startTime?: number): void;
    emitMidiEvent(bytes: number[], eventTime: number): void;
    /**
     * returns the current time
     * @returns {number} the current audioContext time, in seconds
     */
    getCurrentTime(): number;
    /**
     * returns the duration, in seconds, for the input number of ticks
     * @param ticks {number} the number of ticks to convert to seconds
     */
    getTickDuration(ticks: number): number;
    /**
     * Set (or unset) a list of named MIDI notes.  Used to inform earlier MIDI processors what MIDI notes are valid.
     * @param noteList {NoteDefinition[]} a list of midi notes this processor accepts.  Set to undefined to clear the custom note list.
     */
    setCustomNoteList(noteList?: NoteDefinition[]): void;
}

declare const api: FunctionAPI;

declare type RemoteUIElement = {
    type: "action" | "toggle" | "knob" | "slider" | "label" | "col" | "row";
    name: string;
    width?: number;
    height?: number;
    label?: string;
    children?: RemoteUIElement[];
};
declare namespace ui {
    const Col: (name: string, children: RemoteUIElement[], width?: number, height?: number) => RemoteUIElement;
    const Row: (name: string, children: RemoteUIElement[], width?: number, height?: number) => RemoteUIElement;
    const Action: (name: string, width?: number, height?: number) => RemoteUIElement;
    const Toggle: (name: string, width?: number, height?: number) => RemoteUIElement;
    const Knob: (name: string, width?: number, height?: number) => RemoteUIElement;
    const Slider: (name: string, width?: number, height?: number) => RemoteUIElement;
    const Label: (name: string, label: string, width?: number, height?: number) => RemoteUIElement;
    const Register: (root: RemoteUIElement) => void;
}

    `
  }