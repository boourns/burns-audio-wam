import { Sample } from "./Sample"

export type SampleEditorState = {
    samples: SampleState[]
}

export type SampleState = {
    sample: Sample
    height: number
    name: string
    seekPos?: number
    zoom: number
}

export class SampleEditor {
    samples: SampleState[]
    callback?: () => void

    constructor() {
        this.samples = []
    }

    getState(): SampleEditorState {
        return {
            samples: [...this.samples]
        }
    }

    setState(state: SampleEditorState) {
        this.samples = [...state.samples]
        if (this.callback) {
            this.callback()
        }
    }

    defaultSampleState(sample: Sample, name: string): SampleState {
        return {
            sample,
            height: 30 + (100 * sample.buffer.numberOfChannels),
            name: name,
            seekPos: undefined,
            zoom: 1
        }
    }
}