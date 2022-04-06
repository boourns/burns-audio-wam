import { Token } from "monaco-editor"
import { Sample } from "./Sample"

export type SampleEditorState = {
    samples: SampleState[]
}

export type SampleState = {
    token: string
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
    port: MessagePort

    constructor(instanceId: string, context: BaseAudioContext, port: MessagePort) {
        this.context = context
        this.instanceId = instanceId
        this.samples = []
        this.port = port
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
                
                this.sendSampleToProcessor(sample)

                if (this.callback) {
                    this.callback()
                }
            })

            console.log("done loading sample")
        }
    }

    sendSampleToProcessor(sample: SampleState) {
        let channelData: Float32Array[] = []
        for (let i = 0; i < sample.sample.buffer.numberOfChannels; i++) {
            channelData.push(sample.sample.buffer.getChannelData(i))
        }

        console.log("Channel lengths are ", JSON.stringify(channelData.map(c => c.length)))

        let message = {source:"ar", action:"load", token: sample.token, buffer: channelData}

        console.log("Attempting to transfer ", message)
        this.port.postMessage(message)
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
            token: token(),
            sample,
            state: "LOADED",
            height: 30 + (100 * sample.buffer.numberOfChannels),
            name: name,
            seekPos: undefined,
            zoom: 1
        }
    }
}

function token() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 16)
}