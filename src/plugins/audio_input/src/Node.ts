/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import { ChannelCounter } from './ChannelCounter';

export default class AudioInputNode extends CompositeAudioNode {
    _wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    stream!: MediaStream
    streamNode!: MediaStreamAudioSourceNode
    channelCounter!: ChannelCounter
    muteControl: GainNode;

    callback?: () => void

    muted: boolean
    channelMapOptions: number[][]
    channelMapIndex: number

    state = {
    }

    constructor(audioContext: AudioContext, baseUrl: string, options = {}) {
        super(audioContext, options);

        this.generateChannelOptions()

        this.createNodes();
    }

    /*  #########  Personnal code for the web audio graph  #########   */
    async createNodes() {
        let ctx = this.context as AudioContext
        if (!navigator.mediaDevices) {
            throw new Error("browser does not support navigator.mediaDevices")
        }

        let stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
        })
        this.stream = stream

        console.log("stream is ", stream)
        console.log("tracks are ", stream.getAudioTracks())
        for (let t of stream.getAudioTracks()) {
            let constraints = t.getConstraints()
            constraints.autoGainControl = false
            constraints.echoCancellation = false
            constraints.noiseSuppression = false
            await t.applyConstraints(constraints)

            console.log("After applying, constraints are ", t.getConstraints())
        }

        // Create a MediaStreamAudioSourceNode  
        // Feed the HTMLMediaElement into it
        this.streamNode = ctx.createMediaStreamSource(stream);

        console.log("streamNode has ", this.streamNode.numberOfInputs, " inputs and ", this.streamNode.numberOfOutputs, " outputs")

        let channelCounter = new ChannelCounter(ctx)
        this.channelCounter = channelCounter

        await channelCounter.register()

        this._input = this.context.createGain()
        this.muteControl = this.context.createGain()
        this._output = this.muteControl

        this.setMute(true)

        this.channelCounter.callback = () => {
            this.updateFromState()
        }

        this.updateFromState()

        //super.connect(this._input)
    }

    generateChannelOptions() {
        let count = this.channelCounter?.count
        if (!count) {
            count = 2
            this.channelMapIndex = -1
        }

        let defaultIndex = 0
        let results: number[][] = []
        for (let i = 0; i < count; i++) {
            results.push([i])
        }

        if (count > 1) {
            // default to stereo (0,1)
            defaultIndex = results.length

            for (let i = 0; i < count; i += 2) {
                results.push([i, i + 1])
            }
        }

        this.channelMapOptions = results
        if (this.channelMapIndex >= results.length || this.channelMapIndex < 0) {
            this.channelMapIndex = defaultIndex
        }
    }

    updateFromState() {        
        this.streamNode.disconnect()

        this.generateChannelOptions()

        let channels = this.channelMapOptions[this.channelMapIndex]

        this.channelCounter.createOutput(channels.length > 1)
        this.channelCounter.setChannels(channels)

        this.streamNode.connect(this.channelCounter.channelCounter)
        this.channelCounter.channelCounter.connect(this._output)

        if (this.callback) {
            this.callback()
        }
    }

    setMute(mute: boolean) {
        this.muted = mute
        this.muteControl.gain.value = (mute ? 0 : 1.0)
    }

    get paramMgr(): ParamMgrNode {
        return this._wamNode;
    }

    // /**
    //  * @param {ParamMgrNode<Params, InternalParams>} wamNode
    //  */
    setup(paramMgr: ParamMgrNode) {
        this._wamNode = paramMgr
    }
}
