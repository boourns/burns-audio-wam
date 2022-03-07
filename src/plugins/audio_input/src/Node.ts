/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import {ScheduledMIDIEvent} from '../../shared/midi'

export default class AudioInputNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    streamNode!: MediaStreamAudioSourceNode
    stream!: MediaStream

    state = {
    }

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
        if (navigator.mediaDevices) {
            console.log('getUserMedia supported.');
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

        } else {
           console.log('getUserMedia not supported on your browser!');
        }

        this._input = this.context.createGain()
        this._output = this.streamNode

        //super.connect(this._input)

        // this.updateFromState()
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
