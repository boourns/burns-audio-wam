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
     * @param tick {number}
     * @param params {Record<string, number>}
     * */
    onTick(tick, params) {
        // onTick is called once every sequencer tick, which is 96 PPQN
        // it returns an array of {note, velocity, duration}
        // where note is the MIDI note number, velocity is an integer from 0 to 127, and duration is the length of the note in ticks.

        if (tick % 24 == 0) {
            api.emitNote(params.base + Math.floor(Math.random() * params.range), 100, 10);
        }
    }

    /** 
     * onMidi is called when a MIDI message is sent to the FunctionSeq instance.
     * @param bytes number[]
     * */
    onMidi(bytes) {
        
    }
}

return new RandomNoteSequencer()
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
    id: string
    config: WAMParameterDefinition
}

declare interface FunctionSequencer = {
    init?(): void
    parameters?(): ParameterDefinition[]
    onTick?(ticks: number, params: Record<string, number>): void
    onMidi?(event: number[]): void
}
    `
  }