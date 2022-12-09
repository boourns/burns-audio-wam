/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import { VideoExtensionOptions } from 'wam-extensions';


// @ts-ignore
import butterchurn from "./vendor/butterchurn.min.js"
// @ts-ignore
import butterchurnPresets from 'butterchurn-presets';

export default class ButterchurnNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode = undefined;

	callback?: () => void
	visualizer: any
	options: VideoExtensionOptions
	renderTime: number
	_input: AudioNode
	presets: Record<string, any>
	chosenPreset: string

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);
        this.presets = {}
		this.chosenPreset = ""

		this.createNodes();
	}

	setup(paramMgr: ParamMgrNode) {
        this._wamNode = paramMgr
	}

	isEnabled = true;
	set status(_sig: boolean) {
		this.isEnabled = _sig;
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
		this._input = this.context.createGain()
		super.connect(this._input)	
		
        this._output = this.context.createGain()
		this._input.connect(this._output)

		this.presets = butterchurnPresets.getPresets();
		this.chosenPreset = Object.keys(this.presets)[0]
	}

	async getState() {
		return {
			parent: await super.getState(),
			preset: this.chosenPreset
		}
	}

	async setState(state: any) {
		if (state.parent) {
			await super.setState(state.parent)
		}

		if (this.chosenPreset != state.preset) {
			this.chosenPreset = state.preset
			this.loadPreset()
			if (this.callback) {
				this.callback()
			}
		}
	}

	selectPreset(newPreset: string) {
		this.chosenPreset = newPreset
		this.loadPreset()
	}

	setVideoOptions(options: VideoExtensionOptions) {

		if (!this.options || this.options.gl != options.gl || this.options.height != options.height || this.options.width != options.width) {
			this.visualizer = butterchurn.createVisualizer(this.context, options.gl, {
				outputFXAA: true,
				width: options.width,
				height: options.height
			})
			
			this.visualizer.connectAudio(this._input);
			this.loadPreset()
		}

		this.options = options
	}

	loadPreset() {
		const preset = this.presets[this.chosenPreset]

		if (preset && this.visualizer) {
			this.visualizer.loadPreset(preset)
		}
	}

	render(inputs: WebGLTexture[], currentTime: number): WebGLTexture[] {
		let elapsedTime
		if (this.renderTime !== undefined) {
			elapsedTime = currentTime - this.renderTime
		}
		this.visualizer.render({elapsedTime})
		this.renderTime = currentTime
		this.options.gl.disable(this.options.gl.BLEND)

		// @ts-ignore
		this.options.gl.bindSampler(0, null)
				// @ts-ignore

		this.options.gl.bindSampler(1, null)
				// @ts-ignore

		this.options.gl.bindSampler(2, null)
				// @ts-ignore

		this.options.gl.bindSampler(3, null)
				// @ts-ignore

		this.options.gl.bindSampler(4, null)
	
		const out = this.visualizer.renderer.targetTexture

		// this.options.gl.bindTexture(this.options.gl.TEXTURE_2D, out);
      	// this.options.gl.generateMipmap(this.options.gl.TEXTURE_2D);

		// this.options.gl.bindTexture(this.options.gl.TEXTURE_2D, null);

		return [out]
	}
}
