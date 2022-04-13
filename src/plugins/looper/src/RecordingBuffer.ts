export class RecordingBuffer {
    channels: Float32Array[][]
    length: number

    constructor(channels: number) {
        this.channels = new Array(channels)
        for (let i = 0; i < channels; i++) {
            this.channels[i] = []
        }
        this.length = 0
    }

    append(startSample: number, endSample: number, channels: Float32Array[]) {
        for (let i = 0; i < channels.length; i++) {
            this.channels[i].push(channels[i].slice(startSample, endSample))
        }
        this.length += (endSample-startSample)
    }

    render(context: AudioContext): AudioBuffer {
        let latency

        // @ts-ignore
        if (context.outputLatency && context.outputLatency > 0) {
            // @ts-ignore
            latency = context.outputLatency
        } else {
            latency = context.baseLatency
        }

        let skipSamples = latency * context.sampleRate
        console.log("Trimming ", skipSamples)

        if (this.length <= skipSamples) {
            throw new Error("No content left after trimming the latency samples!")
        }

        this.length -= skipSamples

        var buffer = context.createBuffer(this.channels.length, this.length, context.sampleRate)

        for (let ch = 0; ch < this.channels.length; ch++) {
            let buf = buffer.getChannelData(ch)
            let bufPos = 0
            for (let idx = 0; idx < this.channels[ch].length; idx++) {
                for (let pos = 0; pos < this.channels[ch][idx].length; pos++) {
                    if (skipSamples > 0) {
                        skipSamples--
                    } else {
                        buf[bufPos++] = this.channels[ch][idx][pos]
                    }
                }
            }
        }
        
        return buffer
    }
}