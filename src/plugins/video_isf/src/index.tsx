/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import * as monaco from 'monaco-editor';
import { WebAudioModule, WamNode } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { DynamicParameterNode } from "../../shared/DynamicParameterNode";

import { VideoExtensionOptions, VideoModuleConfig } from 'wam-extensions';
import { LiveCoderNode, LiveCoderView } from '../../shared/LiveCoderView';

import { ISFShader } from './ISFShader';
import { MultiplayerHandler } from '../../shared/collaboration/MultiplayerHandler';
import { defaultFragmentShader, defaultVertexShader } from './defaultShaders';

import {videoOptionsEqual} from "../../shared/videoOptions"

import styleRoot from "./ISFVideo.scss"

type ISFVideoState = {
	runCount: number
	params: any
}

class ISFVideoNode extends DynamicParameterNode implements LiveCoderNode {
	destroyed = false;
	renderCallback?: () => void;
	runCount: number

	gl: WebGLRenderingContext
	shader: ISFShader
	options: VideoExtensionOptions;
	multiplayer?: MultiplayerHandler;
	multiplayerVertex?: MultiplayerHandler;
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

	registerExtensions() {
		if (window.WAMExtensions.collaboration) {
			this.multiplayer = new MultiplayerHandler(this.instanceId, "fragment")
			this.multiplayer.getDocumentFromHost(defaultFragmentShader())

			this.multiplayerVertex = new MultiplayerHandler(this.instanceId, "vertex")
			this.multiplayerVertex.getDocumentFromHost(defaultVertexShader())

			this.upload()

			if (this.renderCallback) {
				this.renderCallback()
			}
		} else {
			console.warn("host has not implemented collaboration WAM extension")
		}

		if (window.WAMExtensions && window.WAMExtensions.video) {
			window.WAMExtensions.video.setDelegate(this.instanceId, {
				connectVideo: (options: VideoExtensionOptions) => {
					console.log("connectVideo!")

					if (!this.shader || !videoOptionsEqual(this.options, options)) {
						this.options = options

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
						return this.shader.render(inputs, currentTime, this.state)
					} else {
						return inputs
					}
				},
				disconnectVideo: () => {
					console.log("disconnectVideo")
				},
			})
		}
	}

	upload() {
		if (!this.options || !this.multiplayer || !this.multiplayerVertex) {
			return
		}

		let fragmentSource = this.multiplayer.doc.toString()
		let vertexSource = this.multiplayerVertex.doc.toString()

		try {
			this.shader = new ISFShader(this.options, fragmentSource, vertexSource)
			let params = this.shader.wamParameters()

			this.updateProcessor(params)
		} catch(e) {
			console.error("Error creating ISF Shader: ", e)
			this.shader = undefined

			this.error = e
		}
	}

	async runPressed() {
		this.setState({
			runCount: this.runCount+1
		})
	}

	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor {
		let editor = monaco.editor.create(ref, {
			language: '',
			automaticLayout: true
		});

		return editor
	}

	async getState(): Promise<ISFVideoState> {
		return {
			runCount: this.runCount,
			params: await super.getState()
		}
	}

	async setState(state?: Partial<ISFVideoState>): Promise<void> {
		if (!state) {
			return
		}

		if (state.runCount && state.runCount != this.runCount) {
			this.runCount = state.runCount

			this.upload()
		}

		if (state.params) {
			await super.setState(state.params)
		}

		if (this.renderCallback) {
			this.renderCallback()
		}
	}
}

export default class ISFVideoModule extends WebAudioModule<ISFVideoNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/ISFVideoProcessor.js`;
	nonce: string | undefined;

	get instanceId() { return "TomBurnsISFVideo" + this._timestamp; }

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	configureMonaco() {
		const baseURL = this._baseURL
		// @ts-ignore
		self.MonacoEnvironment = {
			getWorkerUrl: function (moduleId: any, label: string) {
				if (label === 'json') {
					return `${baseURL}/monaco/json.worker.bundle.js`;
				}
				if (label === 'css' || label === 'scss' || label === 'less') {
					return `${baseURL}/monaco/css.worker.bundle.js`;
				}
				if (label === 'html' || label === 'handlebars' || label === 'razor') {
					return `${baseURL}/monaco/html.worker.bundle.js`;
				}
				if (label === 'typescript' || label === 'javascript') {
					return `${baseURL}/monaco/ts.worker.bundle.js`;
				}
				return `${baseURL}/monaco/editor.worker.bundle.js`;
			}
		}
	}

	async initialize(state: any) {
		await this._loadDescriptor();
		this.configureMonaco();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await ISFVideoNode.addModules(this.audioContext, this.moduleId)
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: ISFVideoNode = new ISFVideoNode(this, {});
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

		//var shadow = div.attachShadow({mode: 'open'});
		if (this.nonce) {
			// we've already rendered before, unuse the styles before using them again
			this.nonce = undefined

			//@ts-ignore
			styleRoot.unuse()
		}

		this.nonce = Math.random().toString(16).substr(2, 8);
		div.setAttribute("data-nonce", this.nonce)


		// @ts-ignore
		styleRoot.use({ target: div });

		render(<LiveCoderView plugin={this._audioNode}></LiveCoderView>, div);

		return div;
	}

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}
		
		render(null, el)
	}
}
