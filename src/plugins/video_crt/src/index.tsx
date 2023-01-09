/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WamNode, WebAudioModule } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { DynamicParameterNode } from "../../shared/DynamicParameterNode";
import { VideoExtensionOptions } from 'wam-extensions';

import {videoOptionsEqual} from "../../shared/videoOptions"

import styles from "./ISFVideo.module.scss"
import { insertStyle} from "../../shared/insertStyle"
import { GLSLPPlayer } from './GLSLPPlayer';

class CRTVideoNode extends DynamicParameterNode {
	destroyed = false;
	renderCallback?: () => void;
	runCount: number

	shader: GLSLPPlayer

	gl: WebGL2RenderingContext
	options: VideoExtensionOptions;
	error?: any

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, {...options, processorOptions: {
			numberOfInputs: 1,
			numberOfOutputs: 1,
			outputChannelCount: [2],
		}}, 
		[
			{
				name: "Parameters",
				params: []
			}
		]);

		this.runCount = 0

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}

	upload() {
		if (!this.gl) {
			return
		}

		this.shader = new GLSLPPlayer(this.options)
	}

	registerExtensions() {
		if (window.WAMExtensions && window.WAMExtensions.video) {
			window.WAMExtensions.video.setDelegate(this.instanceId, {
				connectVideo: (options: VideoExtensionOptions) => {
					console.log("connectVideo!")

					if (!this.shader || !videoOptionsEqual(this.options, options)) {
						this.options = options
						this.gl = options.gl
						
						this.upload()
					}
				},
				config: () => {
					return {
						numberOfInputs: 1,
						numberOfOutputs: 1,
					}
				},
				render: (inputs: WebGLTexture[], currentTime: number) => {
					if (this.shader) {
						return this.shader.render(inputs, currentTime)
					} else {
						return inputs
					}
				},
				disconnectVideo: () => {
					console.log("disconnectVideo")
				},
			})
		}

		if (window.WAMExtensions.runPreset) {
			window.WAMExtensions.runPreset.register(this.instanceId, {
				runPreset: () => {
					this.upload()
				}
			})
		}
	}
}

export default class ISFVideoModule extends WebAudioModule<CRTVideoNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/CRTVideoProcessor.js`;

	get instanceId() { return "com.sequencerParty.crtVideo" + this._timestamp; }

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	async initialize(state: any) {
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await CRTVideoNode.addModules(this.audioContext, this.moduleId)
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: CRTVideoNode = new CRTVideoNode(this, {});
		await node._initialize();

		node.registerExtensions()

		if (initialState) node.setState(initialState);

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		insertStyle(shadow, styles.toString())

		return div;
	}

	destroyGui(el: Element) {		
		render(null, el)
	}
}
