export type MIDINote = {
    note: number
    velocity: number
    duration: number
}

export type WAMParameterDefinition = {
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

export type ParameterDefinition = {
    id: string
    config: WAMParameterDefinition
}

export interface FunctionSequencer {
    parameter(): WAMParameterDefinition[]
    onTick(tick: number): MIDINote[]
}