/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import {ScheduledMIDIEvent} from '../../shared/midi'
import { VideoExtensionOptions } from 'wam-extensions';

export default class VideoInputNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    streamNode!: MediaStreamAudioSourceNode
    stream!: MediaStream

    sourceVideo?: HTMLVideoElement

    state = {
    }

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: AudioContext, baseUrl: string, options={}) {        
		super(audioContext, options);
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
                video: true,
            })
            this.stream = stream
            
            for (let t of stream.getAudioTracks()) {
                let constraints = t.getConstraints()
                constraints.autoGainControl = false
                constraints.echoCancellation = false
                constraints.noiseSuppression = false
                await t.applyConstraints(constraints)
            }

            // Create a MediaStreamAudioSourceNode  
            this.streamNode = ctx.createMediaStreamSource(stream);

            this.sourceVideo = document.createElement("video")
            this.sourceVideo.srcObject = stream;
            this.sourceVideo.play();

            document.body.appendChild(this.sourceVideo)

            // @ts-ignore

            if (window.WAMExtensions && window.WAMExtensions.video) {
                window.WAMExtensions.video.setDelegate(this.instanceId, {
                    connectVideo: (options: VideoExtensionOptions, input?: WebGLTexture) => {
                        console.log("connectVideo!")
                        return this.attach(options, input)
                    },
                    render: (currentTime: number) => {
                       this.render()
                    },
                    disconnectVideo: () => {
                        console.log("disconnectVideo")
                    },
                })
            }

        } else {
           console.log('getUserMedia not supported on your browser!');
        }

        this._input = this.context.createGain()
        this._output = this.streamNode

        //super.connect(this._input)

        // this.updateFromState()
	}

    config?: VideoExtensionOptions
    texture?: WebGLTexture

    attach(config: VideoExtensionOptions, input?: WebGLTexture): WebGLTexture {
		this.config = config
        let gl = this.config.gl
                
        this.texture = gl.createTexture();
        this.render()

		return this.texture
	}

    render() {
        console.log("render")

        let gl = this.config.gl

        gl.bindTexture(gl.TEXTURE_2D, this.texture);        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.sourceVideo);
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
