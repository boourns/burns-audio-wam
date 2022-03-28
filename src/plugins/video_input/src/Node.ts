/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import {ScheduledMIDIEvent} from '../../shared/midi'
import { VideoExtensionOptions } from 'wam-extensions';
import { VideoModuleConfig } from 'wam-extensions/dist/video/VideoExtension';

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
                audio: false,
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
            this.sourceVideo.setAttribute("style", "display: none;")

            document.body.appendChild(this.sourceVideo)

            // @ts-ignore

            if (window.WAMExtensions && window.WAMExtensions.video) {
                window.WAMExtensions.video.setDelegate(this.instanceId, {
                    connectVideo: (options: VideoExtensionOptions): VideoModuleConfig => {
                        console.log("connectVideo!")
                        this.attach(options)
                        return {
                            numberOfInputs: 0,
                            numberOfOutputs: 1,
                        }
                    },
                    render: (inputs: WebGLTexture[], currentTime: number): WebGLTexture[] => {
                       return [this.render()]
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
    canvas?: HTMLCanvasElement

    attach(config: VideoExtensionOptions, input?: WebGLTexture) {
		this.config = config
        let gl = this.config.gl
                
        this.texture = gl.createTexture();

        var c = document.createElement("canvas");
        c.width = config.width;
        c.height = config.height;
        var ctx = c.getContext("2d"); 
        //ctx.fillStyle = "rgba(0, 0, 0, 1)";
        //ctx.globalCompositeOperation = "destination-out";
        //ctx.fillRect(0, 0, 64, 64);
        //ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgb(255, 128, 64)";
        ctx.font = "40px Arial";
        ctx.fillText("some text", 128 - 64, 128);
        c.setAttribute("style", "display: none;")
        this.canvas = c

        document.body.appendChild(this.canvas)

        this.render()
	}

    render(): WebGLTexture {
        let gl = this.config.gl

        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

       // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.sourceVideo);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.sourceVideo);

        return this.texture
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
