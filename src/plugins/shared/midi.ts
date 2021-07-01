export class MIDI {
	static NOTE_ON = 0x90;
	static NOTE_OFF = 0x80;
	static CC = 0xB0;
}

export type MIDIEvent = Uint8Array
export type ScheduledMIDIEvent = {
    event: MIDIEvent,
    time: number
}