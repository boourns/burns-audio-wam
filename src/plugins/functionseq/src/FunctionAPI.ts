import { FunctionKernel } from "./FunctionKernel"
import { MIDI } from "./FunctionSeqProcessor"

export class FunctionAPI {
    port: MessagePort
    kernel: FunctionKernel

    constructor(port: MessagePort, kernel: FunctionKernel) {
        this.port = port
        this.kernel = kernel
    }

    emitNote(note: number, velocity: number, duration: number, startTime?: number) {
        this.emitMidiEvent([MIDI.NOTE_ON, note, velocity], startTime)
        this.emitMidiEvent([MIDI.NOTE_OFF, note, velocity], startTime+duration)
    }

    emitMidiEvent(data: number[], eventTime: number) {
        
    }
}