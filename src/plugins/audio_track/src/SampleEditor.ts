import { Sample } from "./Sample"

export type SampleEditorState = {
    samples: SampleState[]
}

export type ClipSettings = {
    clipEnabled: boolean
    loopEnabled: boolean
    startingOffset: number // in samples
    loopStartBar: number // in bars
    loopLengthBars: number // in bars
}

export type SampleState = {
    token: string
    clipId: string
    sample?: Sample
    assetUrl?: string
    state: "INIT" | "LOADING" | "DECODING" | "LOADED" | "ERROR"
    error?: DOMException
    height: number
    name: string
    seekPos?: number
    zoom: number
    clipSettings: ClipSettings
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

            console.log("downloaded buffer is bytes: ", buffer.byteLength)
    
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
            }, (error: DOMException) => {
                sample.error = error
                sample.state = "ERROR"
            })
        }
    }

    sendSampleToProcessor(sample: SampleState) {
        let channelData: Float32Array[] = []
        for (let i = 0; i < sample.sample.buffer.numberOfChannels; i++) {
            channelData.push(sample.sample.buffer.getChannelData(i))
        }

        let message = {source:"ar", action:"load", token: sample.token, clipId: sample.clipId, buffer: channelData, settings: sample.clipSettings}

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

    setClipSettings(token: string, settings: ClipSettings) {
        let existing = this.samples.find(s => s.token == token)
        if (!existing) {
            console.error("Setting clip settings for missing sample: token ", token)
            return
        }
        existing.clipSettings = settings

        this.sendClipSettingsToProcessor(existing)

        if (this.callback) {
            this.callback()
        }
    }

    sendClipSettingsToProcessor(sample: SampleState) {
        let message = {source:"ar", action:"clipSettings", token: sample.token, clipId: sample.clipId, clipSettings: sample.clipSettings}

        this.port.postMessage(message)
    }

    defaultSampleState(sample: Sample, name: string, clipId: string): SampleState {
        return {
            token: token(),
            clipId,
            sample,
            state: "LOADED",
            height: 30 + (100 * sample.buffer.numberOfChannels),
            name: name,
            seekPos: undefined,
            zoom: 1,
            clipSettings: {
                clipEnabled: true,
                loopEnabled: false,
                startingOffset: 0,
                loopLengthBars: 1,
                loopStartBar: 0,
            }
        }
    }
}

function token() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 16)
}