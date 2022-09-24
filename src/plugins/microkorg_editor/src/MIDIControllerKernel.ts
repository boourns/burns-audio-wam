import { WamAutomationEvent, WamMidiData, WamMidiEvent, WamParameterConfiguration, WamParameterDataMap, WamSysexEvent } from "@webaudiomodules/api"

export interface MIDIControllerKernel {
    wamParameters(): Record<string, WamParameterConfiguration>
    ingestMIDI(event: WamMidiData): boolean

    parameterUpdate(params: Record<string, number>): boolean
    automationMessages(force?: boolean): WamAutomationEvent[]
    midiMessages(channel: number, force?: boolean): WamMidiEvent[]
    
    sysexNeeded(): boolean
    toSysex(): Uint8Array 
    fromSysex(data: Uint8Array): boolean
}