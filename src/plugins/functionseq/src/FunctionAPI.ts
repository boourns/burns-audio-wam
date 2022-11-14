import { AudioWorkletGlobalScope } from "@webaudiomodules/api"
import { FunctionKernel } from "./FunctionKernel"
import { FunctionSequencerProcessor, MIDI } from "./FunctionSeqProcessor"

let processor: FunctionSequencerProcessor
let kernel: FunctionKernel

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope


export function setProcessor(p: FunctionSequencerProcessor) {
    processor = p
}

export function setKernel(k: FunctionKernel) {
    kernel = k
}

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

    emitMidiEvent(bytes: number[], eventTime: number) {
        processor.emitEvents(
            { type: 'wam-midi', time: eventTime, data: { bytes } }
        )
    }
}