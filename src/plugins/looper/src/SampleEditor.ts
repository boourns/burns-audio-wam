import { Sample } from "./Sample"

export type SampleEditorState = {
    samples: SampleState[]
}

export type SampleState = {
    sample?: Sample
    assetUrl?: string
    state: "INIT" | "LOADING" | "DECODING" | "LOADED"
    height: number
    name: string
    seekPos?: number
    zoom: number
}

export class SampleEditor {
    samples: SampleState[]
    callback?: () => void
    instanceId: string
    context: BaseAudioContext

    constructor(instanceId: string, context: BaseAudioContext) {
        this.context = context
        this.instanceId = instanceId
        this.samples = []
    }

    getState(): SampleEditorState {
        return {
            samples: [...this.samples]
        }
    }

    async loadSample(sample: SampleState) {
        sample.state = "LOADING"

        let asset = await window.WAMExtensions.assets.loadAsset(this.instanceId, sample.assetUrl)

        if (asset && asset.content) {
            let buffer = await asset.content.arrayBuffer()
    
            this.context.decodeAudioData(buffer, (buffer: AudioBuffer) => {
                let sampleData = new Sample(this.context, buffer)

                sample.sample = sampleData
                sample.height = 30 + (100 * sampleData.buffer.numberOfChannels)
                sample.name = asset.name
                sample.state = "LOADED"
                if (this.callback) {
                    this.callback()
                }
            })

            console.log("done loading sample")
        }
    }

    setState(state: SampleEditorState) {
        this.samples = [...state.samples]
        for (let sample of this.samples) {
            if (sample.state == "INIT") {
                this.loadSample(sample)
            }
        }
        if (this.callback) {
            this.callback()
        }
    }

    defaultSampleState(sample: Sample, name: string): SampleState {
        return {
            sample,
            state: "LOADED",
            height: 30 + (100 * sample.buffer.numberOfChannels),
            name: name,
            seekPos: undefined,
            zoom: 1
        }
    }
}