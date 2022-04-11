/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import {ScheduledMIDIEvent} from '../../shared/midi'
import { ChannelCounter } from './ChannelCounter';

export default class AudioInputNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    streamNode!: MediaStreamAudioSourceNode
    channelCounter!: ChannelCounter

    stream!: MediaStream

    muted: boolean

    state = {
    }

    muteControl: GainNode;
    callback?: () => void

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: AudioContext, baseUrl: string, options={}) {        
		super(audioContext, options);

		this.createNodes();
	}

	/**
	 * @param {ParamMgrNode<Params, InternalParams>} wamNode
	 */
	setup(paramMgr: ParamMgrNode) {
        this._wamNode = paramMgr
	}

	isEnabled = true;
	set status(_sig: boolean) {
		this.isEnabled = _sig
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	async createNodes() {
        let ctx = this.context as AudioContext
        if (!navigator.mediaDevices) {
            throw new Error("browser does not support navigator.mediaDevices")
        }

        let stream = await navigator.mediaDevices.getUserMedia ({
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

        channelCounter.createOutput(false)
        channelCounter.setChannels([0])

        this._input = this.context.createGain()
        this.muteControl = this.context.createGain()
        this._output = this.muteControl

        this.streamNode.connect(channelCounter.channelCounter)
        channelCounter.channelCounter.connect(this._output)

        this.setMute(true)

        if (this.callback) {
            this.callback()
        }

        //super.connect(this._input)

        // this.updateFromState()
	}

    setMute(mute: boolean) {
        this.muted = mute
        this.muteControl.gain.value = (mute ? 0 : 1.0)
    }

    // MIDI handling
    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		
    }


    async getState(): Promise<any> {
        let params = await super.getState()
        return {
            ...this.state,
            params
        }
    }

    
}
