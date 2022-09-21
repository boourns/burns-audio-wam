import { WamAutomationEvent, WamMidiData, WamParameterConfiguration, WamParameterDataMap, WamSysexEvent } from "@webaudiomodules/api"

export interface MIDIControllerKernel {
    wamParameters(): Record<string, WamParameterConfiguration>
    ingestMIDI(event: WamMidiData): boolean
    ingestSysex(event: WamSysexEvent): boolean
    parameterUpdate(params: WamParameterDataMap): void
    automationMessages(force: boolean): WamAutomationEvent[]
}