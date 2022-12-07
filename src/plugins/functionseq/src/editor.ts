import script from "./defaultScript.txt"
import functionTypes from "./types/FunctionSequencer.txt"
import uiTypes from "./types/RemoteUI.txt"

export function defaultScript(): string {
    return script
}

export function editorDefinition(): string {
    
    return `
    declare type WamParameterType = 'float' | 'int' | 'boolean' | 'choice';

declare interface WamParameterConfiguration {
    /** The parameter's human-readable name. */
    label?: string;
    /** The parameter's data type. */
    type?: WamParameterType;
    /** The parameter's default value. Must be within range [minValue, maxValue]. */
    defaultValue?: number;
    /** The minimum valid value of the parameter's range. */
    minValue?: number;
    /** The maximum valid value of the parameter's range. */
    maxValue?: number;
    /** The distance between adjacent valid integer values, if applicable. */
    discreteStep?: number;
    /** The nonlinear (exponential) skew of the parameter's range, if applicable. */
    exponent?: number;
    /** A list of human-readable choices corresponding to each valid value in the parameter's range, if applicable. */
    choices?: string[];
    /** A human-readable string representing the units of the parameter's range, if applicable. */
    units?: string;
}

declare interface WamTransportData {
    /** Bar number */
    currentBar: number;
    /** Timestamp in seconds (WebAudio clock) */
    currentBarStarted: number;
    /** Beats per Minute */
    tempo: number;
    /** Beats count per Bar */
    timeSigNumerator: number;
    /** Beat duration indicator */
    timeSigDenominator: number;
    /** Determines if transport is active */
    playing: boolean;
}

${functionTypes}

${uiTypes}

declare const api: FunctionAPI;
declare const ui: RemoteUI;
    `
  }