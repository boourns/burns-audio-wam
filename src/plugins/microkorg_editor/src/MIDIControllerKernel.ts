import { WamAutomationEvent, WamMidiData, WamParameterConfiguration, WamParameterDataMap, WamSysexEvent } from "@webaudiomodules/api"

export interface MIDIControllerKernelType {
    wamParameters(): Record<string, WamParameterConfiguration>
    ingestMIDI(event: WamMidiData): boolean
    ingestSysex(event: WamSysexEvent): boolean
    parameterUpdate(params: WamParameterDataMap): void
    automationMessages(force: boolean): WamAutomationEvent[]
}

export interface MIDIControllerKernelClass extends MIDIControllerKernelType {
    new (): MIDIControllerKernelType;
}