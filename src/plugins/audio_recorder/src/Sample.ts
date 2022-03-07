import { WaveFile } from "wavefile"

var debug = console.log

export class Sample {
    context: BaseAudioContext
    buffer: AudioBuffer

    constructor(context: BaseAudioContext, buffer: AudioBuffer) {
        this.context = context
        this.buffer = buffer
    }

    saveWav(bitDepth: number): Blob {
        //fromScratch(numChannels, sampleRate, bitDepth, samples)
        let wav = new WaveFile()
        let channels = []
        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            channels.push(this.buffer.getChannelData(i))
        }

        wav.fromScratch(this.buffer.numberOfChannels, this.buffer.sampleRate, "32f", channels)
        return new Blob([wav.toBuffer()], {type:"audio/wave"})
    }

    absPeak(): number {
        let peak = 0

        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let buf = this.buffer.getChannelData(i)
            for (let j = 0; j < buf.length; j++) {
                if (Math.abs(buf[j]) > peak) {
                    peak = Math.abs(buf[j])
                }
            }
        }

        return peak
    }

    amplify(factor: number): Sample {
        let scaledBuffer = this.context.createBuffer(this.buffer.numberOfChannels, this.buffer.length, this.buffer.sampleRate)

        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let src = this.buffer.getChannelData(i)
            let dst = scaledBuffer.getChannelData(i)

            for (let j = 0; j < src.length; j++) {
               dst[j] = src[j] * factor
            }
        }

        return new Sample(this.context, scaledBuffer)
    }

    // accepts 'pos', a float from 0 to 1 representing position to trim left from
    trimLeft(pos: number): Sample {
        let startPos = this.buffer.length * pos
        let length = this.buffer.length - startPos

        let trimmed = this.context.createBuffer(this.buffer.numberOfChannels, length, this.buffer.sampleRate)
        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let src = this.buffer.getChannelData(i)
            let dst = trimmed.getChannelData(i)

            for (let j = 0; j < length; j++) {
               dst[j] = src[startPos+j]
            }
        }

        return new Sample(this.context, trimmed)
    }

    // accepts 'pos', a float from 0 to 1 representing position to trim right from
    trimRight(pos: number): Sample {
        let length = this.buffer.length * pos

        let trimmed = this.context.createBuffer(this.buffer.numberOfChannels, length, this.buffer.sampleRate)
        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let src = this.buffer.getChannelData(i)
            let dst = trimmed.getChannelData(i)

            for (let j = 0; j < length; j++) {
                dst[j] = src[j]
            }
        }

        return new Sample(this.context, trimmed)
    }

    // accepts 'pos', a float from 0 to 1 representing position to fade out from
    fadeOut(pos: number): Sample {
        let startPos = this.buffer.length * pos
        let fadeLength = this.buffer.length - startPos

        let faded = this.context.createBuffer(this.buffer.numberOfChannels, this.buffer.length, this.buffer.sampleRate)
        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let src = this.buffer.getChannelData(i)
            let dst = faded.getChannelData(i)

            for (let j = 0; j < length; j++) {
                if (j < startPos) {
                    dst[j] = src[j]
                } else {
                    let fadeAmt = (j - startPos) / fadeLength
                    // exponential fade out
                    fadeAmt = fadeAmt * fadeAmt
                    dst[j] = src[j] * (1.0 - fadeAmt) 
                }
            }
        }

        return new Sample(this.context, faded)
    }

    // accepts 'pos', a float from 0 to 1 representing position to fade out from
    fadeIn(pos: number): Sample {
        let endPos = this.buffer.length * pos
        let faded = this.context.createBuffer(this.buffer.numberOfChannels, this.buffer.length, this.buffer.sampleRate)

        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let src = this.buffer.getChannelData(i)
            let dst = faded.getChannelData(i)

            for (let j = 0; j < length; j++) {
                if (j < endPos) {
                    let fadeAmt = 1 - ((endPos - j) / endPos)
                    fadeAmt = fadeAmt * fadeAmt

                    // exponential fade out
                    dst[j] = src[j] * fadeAmt
                } else {
                    dst[j] = src[j]
                }
            }
        }

        return new Sample(this.context, faded)
    }

    // Splits a wave into separate waves per channel
    splitChannels(): Sample[] {
        let output: Sample[] = []

        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            let split = this.context.createBuffer(1, this.buffer.length, this.buffer.sampleRate)
            let inp = this.buffer.getChannelData(i)
            let out = split.getChannelData(0)

            for (let i = 0; i < inp.length; i++) {
                out[i] = inp[i]
            }

            output.push(new Sample(this.context, split))
        }

        debug(`splitChannels returning ${output.length} samples`)
        return output
    }
}