import { WamMidiData, WamMidiEvent } from "@webaudiomodules/api"
import { MIDIMessager } from "./ControlChangeMessager"

export class SysexMessager implements MIDIMessager {
    constructor() {
    }

    ingestMIDI(currentChannel: number, currentValue: number, event: WamMidiData): number | undefined {
        return undefined
    }

    toMIDI(channel: number, value: number): WamMidiEvent[] {
        return []
    }

    sysexNeeded(): boolean {
        return true
    }
}