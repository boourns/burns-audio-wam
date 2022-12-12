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

import styles from "./ISFVideo.module.scss"
import { insertStyle} from "../../shared/insertStyle"
import monacoStyle from "../../../../node_modules/monaco-editor/min/vs/editor/editor.main.css"

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
	multiplayers: MultiplayerHandler[];
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
			this.multiplayers = []
			const fragment = new MultiplayerHandler(this.instanceId, "fragment", "Fragment Shader")
			fragment.getDocumentFromHost(defaultFragmentShader())
			this.multiplayers.push(fragment)

			const vertex = new MultiplayerHandler(this.instanceId, "vertex", "Vertex Shader")
			vertex.getDocumentFromHost(defaultVertexShader())
			this.multiplayers.push(vertex)

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
						numberOfInputs: this.shader ? this.shader.numberOfInputs() : 1,
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
		if (!this.options || !this.multiplayers || this.multiplayers.length == 0) {
			return
		}

		let fragmentSource = this.multiplayers[0].doc.toString()
		let vertexSource = this.multiplayers[1].doc.toString()

		this.error = undefined
		this.multiplayers[0].setError(undefined)
		this.multiplayers[1].setError(undefined)

		try {

			this.shader = new ISFShader(this.options, fragmentSource, vertexSource)
			this.shader.compile()
			let params = this.shader.wamParameters()

			this.updateProcessor(params)

		} catch(e) {						
			console.error("Error creating ISF Shader: ", e)
			
			this.error = e
			
			this.multiplayers[0].setError({line: this.shader.renderer.errorLine, message: e})
			this.shader = undefined
		}

		if (this.renderCallback) {
			this.renderCallback()
		}
	}

	initVertexShader() {
		const doc = this.multiplayers[1].doc

		const orig = doc.toString()
		doc.delete(0, orig.length)
		doc.insert(0, defaultVertexShader())
	}

	initFragmentShader() {
		const doc = this.multiplayers[0].doc

		const orig = doc.toString()
		doc.delete(0, orig.length)
		doc.insert(0, defaultFragmentShader())
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

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
			this.upload()
		});

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R, () => {
			this.upload()
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

	get instanceId() { return "com.sequencerParty.isfVideo" + this._timestamp; }

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

		var shadow = div.attachShadow({mode: 'open'});
		insertStyle(shadow, styles.toString())
		insertStyle(shadow, monacoStyle.toString())

		const actions = [
			<button style="padding: 2px; margin: 4px; background-color: var(--var-ButtonBackground); color: var(--var-ButtonForeground); border: 1px solid var(--var-ButtonForeground);" onClick={() => this.audioNode.initVertexShader()}>Init Vertex Shader</button>
		]

		render(<LiveCoderView plugin={this._audioNode} actions={actions}></LiveCoderView>, shadow);

		return div;
	}

	destroyGui(el: Element) {		
		render(null, el)
	}
}
