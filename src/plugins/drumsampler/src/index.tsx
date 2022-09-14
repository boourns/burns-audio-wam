/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule,  } from '@webaudiomodules/sdk';
import { ParamMgrFactory, CompositeAudioNode} from '@webaudiomodules/sdk-parammgr'
import { DrumSamplerNode } from './Node';
import { h, render } from 'preact';
import { DrumSamplerView } from './views/DrumSamplerView'
import { getBaseUrl } from '../../shared/getBaseUrl';
import styles from "./views/DrumSamplerView.scss"

export default class DrumSampler extends WebAudioModule<DrumSamplerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	nonce: string | undefined;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
		return descriptor
	}

	async initialize(state: any) {
		await this._loadDescriptor();
		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const node = new DrumSamplerNode(this.instanceId, this.audioContext);
		const paramsConfig = Object.assign({}, ...node.kit.voices.map((v, i) => v.paramsConfig(i+1)))
		paramsConfig["compression"] = {
			minValue: 0,
			maxValue: 1,
			defaultValue: 0,
		}
        const internalParamsConfig = Object.assign({}, ...node.kit.voices.map((v, i) => v.internalParamsConfig(i+1)))
		internalParamsConfig["compThreshold"] = node.compressor.threshold
		internalParamsConfig["compRatio"] = node.compressor.ratio
		internalParamsConfig["compKnee"] = node.compressor.knee
		internalParamsConfig["compAttack"] = node.compressor.attack
		internalParamsConfig["compRelease"] = node.compressor.release
		const paramsMapping = Object.assign({}, ...node.kit.voices.map((v, i) => v.paramsMapping(i+1)))
		paramsMapping['compression'] = {
			compThreshold: {
				sourceRange: [0, 1],
				targetRange: [0, -40]
			},
			compRatio: {
				sourceRange: [0, 1],
				targetRange: [1, 20]
			},
			compKnee: {
				sourceRange: [0, 1],
				targetRange: [20, 0.1]
			},
			compAttack: {
				sourceRange: [0, 1],
				targetRange: [0.01, 0.0001]
			},
			compRelease: {
				sourceRange: [0, 1],
				targetRange: [0.05, 0.3]
			}
		}
        const optionsIn = { internalParamsConfig, paramsConfig, paramsMapping };
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		
		node.setup(paramMgrNode);

		if (initialState) {
			node.setState(initialState)
		} else {
			node.setState({
				kit: {
					slots: [
						{
							name: "Kick",
							uri: "https://burns.ca/static/909/kick.wav",
							note: 36,
						},
						{
							name: "Rimshot",
							uri: "https://burns.ca/static/909/rimshot.wav",
							note: 37,
						},
						{
							name: "Snare",
							uri: "https://burns.ca/static/909/snare.wav",
							note: 38,
						},
						{
							name: "Clap",
							uri: "https://burns.ca/static/909/clap.wav",
							note: 39,
						},
						{
							name: "Low Tom",
							uri: "https://burns.ca/static/909/low_tom.wav",
							note: 41,
						},
						{
							name: "Mid Tom",
							uri: "https://burns.ca/static/909/mid_tom.wav",
							note: 47,
						},
						{
							name: "High Tom",
							uri: "https://burns.ca/static/909/hi_tom.wav",
							note: 43,
						},
						{
							name: "CH",
							uri: "https://burns.ca/static/909/ch.wav",
							note: 42,
						},
						{
							name: "OH",
							uri: "https://burns.ca/static/909/oh.wav",
							note: 46,
						},
						{
							name: "Crash",
							uri: "https://burns.ca/static/909/crash.wav",
							note: 49,
						},
						{
							name: "Ride",
							uri: "https://burns.ca/static/909/ride.wav",
							note: 51,
						},
					]
				}
			})
		}
		return node;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		var shadow = div.attachShadow({mode: 'open'});

		if (this.nonce) {
			// we've already rendered before, unuse the styles before using them again
			this.nonce = undefined

			//@ts-ignore
			styleRoot.unuse()
		}

		this.nonce = Math.random().toString(16).substr(2, 8);
		div.setAttribute("data-nonce", this.nonce)

		// @ts-ignore
    	styles.use({ target: shadow });

		div.setAttribute("style", "display: flex; flex-direction: column: width: 100%; height: 100%")

		let initialState = this.audioNode.paramMgr.getParamsValues()

		render(<DrumSamplerView initialState={initialState} plugin={this}></DrumSamplerView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}
		
		render(null, el.shadowRoot)
	}
}
