// Register Class as an AudioWorklet Processor

function addAudioWorklet(context: BaseAudioContext, proc: any){
    var f=`data:text/javascript,${encodeURI(proc.toString())};
            try {registerProcessor("${proc.name}",${proc.name}) } catch (e) { }`;
    return context.audioWorklet.addModule(f);
}

// AudioWorklet Processor Class

class AudioWorkletProcessor{}

class ChannelCountProcessor extends AudioWorkletProcessor {
    channels: number[]

    constructor(options: AudioWorkletNodeOptions) {
        // @ts-ignore
        super(options)

        this.channelCount = 0
        this.channels = []

        // @ts-ignore
        this.port.onmessage = (ev: MessageEvent<any>) => {
            if (ev.data.action == "channels") {
                this.channels = ev.data.channels
            }
        }
    }

    channelCount: number

    process (inputs: Float32Array[][], outputs: Float32Array[][], parameters: any): boolean {
        if (inputs.length == 0) {
            return true
        }
        
        if (inputs[0].length != this.channelCount && inputs[0].length > 0) {
            this.channelCount = inputs[0].length

            // @ts-ignore
            this.port.postMessage({action:"count", count: this.channelCount})
        }

        if (outputs.length == 0) {
            return true
        }

        // map from inputs[this.channels[0], this.channels[1]] to outputs[0, 1]
        // may be stereo or mono depending on how AudioWorkletNode was instantiated
        for (let i = 0; i < outputs[0].length; i++) {
            if (i < this.channels.length && this.channels[i] < inputs[0].length) {
                for (let k = 0; k < outputs[0][i].length; k++) {
                    outputs[0][i][k] = inputs[0][this.channels[i]][k]
                }
            }
        }

        return true 
    }
}

export class ChannelCounter {
    context: BaseAudioContext
    channelCounter?: AudioWorkletNode
    callback?: () => void
    count?: number

    stereo: boolean

    constructor(context: BaseAudioContext) {
        this.context = context
    }

    async register() {
        await addAudioWorklet(this.context, ChannelCountProcessor);
    }

    createOutput(stereo: boolean) {
        if (!!this.channelCounter) {
            if (this.stereo == stereo) {
                return
            }
            this.channelCounter.disconnect()
        }

        this.stereo = stereo

        this.channelCounter = new AudioWorkletNode(this.context, 'ChannelCountProcessor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [stereo ? 2 : 1]
        });

        this.channelCounter.port.onmessage = (ev: MessageEvent<any>) => {

            if (ev.data.action == "count") {
                if (ev.data.count != this.count) {
                    if (this.callback) {
                        this.count = ev.data.count

                        this.callback()
                    }
                }
            }
        }
    }

    setChannels(channels: number[]) {
        this.channelCounter.port.postMessage({
            action:"channels",
            channels
        })
    }
}