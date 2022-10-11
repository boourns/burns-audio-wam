import { WamParameterConfiguration } from "@webaudiomodules/api";

type ParameterDefinition = {
    id: string
    config: WamParameterConfiguration
}

type FunctionSequencer = {
    parameters?(): ParameterDefinition[]
    onTick?(ticks: number, params: Record<string, any>): {note: number, velocity: number, duration: number}[]
}

export class FunctionKernel {
    function: FunctionSequencer

    constructor() {
        
    }

    onTick() {
        try {
            if (this.function.onTick) {
                let params: any = {}
                for (let id of this.parameterIds) {
                    params[id] = this._parameterInterpolators[id].values[startSample]
                }
                var notes = this.function.onTick(this.ticks, params)
                
                if (notes) {
                    for (let note of notes) {
                        this.emitEvents(
                            { type: 'wam-midi', time: currentTime, data: { bytes: [MIDI.NOTE_ON, note.note, note.velocity] } },
                            { type: 'wam-midi', time: currentTime+(note.duration*secondsPerTick) - 0.001, data: { bytes: [MIDI.NOTE_OFF, note.note, note.velocity] } }
                        )
                    }
                }
            }
            
        } catch (e) {
            this.port.postMessage({source: "functionSeq", action:"error", error: e.toString()})
            this.function = undefined
        }
    }

}