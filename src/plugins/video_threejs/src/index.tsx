/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import * as monaco from 'monaco-editor';
import * as THREE from 'three';

import { WebAudioModule, addFunctionModule } from '@webaudiomodules/sdk';
import { h, render } from 'preact';

import { getBaseUrl } from '../../shared/getBaseUrl';

import { DynamicParameterNode, DynamicParamGroup } from "../../shared/DynamicParameterNode";
import { ThreeJSRunner } from './ThreeJSRunner';

import { VideoExtensionOptions, VideoModuleConfig } from 'wam-extensions';
import { LiveCoderNode, LiveCoderView } from '../../shared/LiveCoderView';

import { MultiplayerHandler } from '../../shared/collaboration/MultiplayerHandler';
import getThreeJSProcessor from './ThreeJSProcessor';
import { defaultScript, editorDefinition } from './editorDefaults';

import styles from "./VideoThreeJS.module.scss"
import { insertStyle} from "../../shared/insertStyle"
import monacoStyle from "../../../../node_modules/monaco-editor/min/vs/editor/editor.main.css"
import { ThreeJSGenerator } from './ThreeJSGenerator';

type ThreeJSState = {
	runCount: number
	params: any
}

class ThreeJSNode extends DynamicParameterNode implements LiveCoderNode {
	destroyed = false;
	renderCallback?: () => void
	multiplayers: MultiplayerHandler[]
	runCount: number
	error?: any
	errorStack?: string

	analyser: AnalyserNode
	fftArray: Float32Array
	gl: WebGLRenderingContext

	runner: ThreeJSRunner
	options: VideoExtensionOptions;
	generator?: ThreeJSGenerator

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getThreeJSProcessor, moduleId);
	}

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
		[]			
		);

		this.runCount = 0
		this.multiplayers = []

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}

	async registerExtensions() {
		if (window.WAMExtensions.collaboration) {
			this.multiplayers = [new MultiplayerHandler(this.instanceId, "script", "Code")]
			await this.multiplayers[0].getDocumentFromHost(defaultScript())

		} else {
			console.warn("host has not implemented collaboration WAM extension")
		}

		if (window.WAMExtensions && window.WAMExtensions.video) {
			window.WAMExtensions.video.setDelegate(this.instanceId, {
				connectVideo: (options: VideoExtensionOptions) => {
					console.log("connectVideo!")

					//if (!this.runner || !videoOptionsEqual(this.options, options)) {
						this.options = options
						this.runner = new ThreeJSRunner(options)
	
						if (this.generator) {
							try {
								this.generator.initialize(this.context.currentTime, options)
							} catch (e) {
								this.error = e.toString()
								this.errorStack = e.stack
							}
						}
					//}

				},
				config: () => {
					return {
						numberOfInputs: 0,
						numberOfOutputs: 1,
					}
				},
				render: (inputs: WebGLTexture[], currentTime: number): WebGLTexture[] => {
					let params: Record<string, any> = {}
					if (this.state) {
						for (let p of Object.keys(this.state)) {
							params[p] = this.state[p].value
						}
					}

					if (!this.fftArray) {
						this.fftArray = new Float32Array(this.analyser.frequencyBinCount);
					}
					this.analyser.getFloatFrequencyData(this.fftArray)
					
					try {
						return this.runner.render(inputs, this.generator, currentTime, params, this.fftArray)
					} catch (e) {
						this.setError(e.toString(), e.stack)
						return inputs
					}
				},
				disconnectVideo: () => {
					console.log("disconnectVideo")
					
					this.runner.destroy()
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

	async upload() {
		let source = await this.multiplayers[0].doc.toString()
		this.multiplayers[0].setError(undefined)

		try {
			if (this.generator && !this.error) {
				this.generator.destroy()
			}
			let generator = new Function('THREE', source)(THREE) as ThreeJSGenerator

			if (!generator.render) {
				throw new Error("render function missing")
			}
			if (!generator.initialize) {
				throw new Error("initialize function missing")
			}
			if (generator.parameters) {
				let params = generator.parameters()

				let group: DynamicParamGroup = {
					name: "Parameters",
					params
				}

				this.updateProcessor([group])
			}
			if (this.options) {
				generator.initialize(this.context.currentTime, this.options)
			}
			this.generator = generator
			this.error = undefined

		} catch(e: any) {
			console.error("Error creating threejs generator: ", e)

			this.setError(e.toString(), e.stack)
		}

		if (this.renderCallback) {
			this.renderCallback()
		}
	}

	async runPressed() {
		this.setState({
			runCount: this.runCount+1
		})
	}

	async getState(): Promise<ThreeJSState> {
		return {
			runCount: this.runCount,
			params: await super.getState()
		}
	}

	async setState(state?: Partial<ThreeJSState>): Promise<void> {
		if (!state) {
			return
		}

		if (state.runCount && state.runCount != this.runCount) {
			this.runCount = state.runCount

			await this.upload()
		}

		if (state.params) {
			await super.setState(state.params)
		}
	}

	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor {
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			allowJs: true,
			checkJs: true,
			alwaysStrict: true,
		})
	  
		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false,
		});
	
		const libUriString = 'ts:filename/threejsScene.d.ts'
		const libUri = monaco.Uri.parse(libUriString)

		if (!monaco.editor.getModel(libUri)) {
			const libSource = editorDefinition()

			monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUriString)
			
			monaco.editor.createModel(libSource, 'typescript', libUri);
		}
	
		let editor = monaco.editor.create(ref, {
			language: 'javascript',
			automaticLayout: true
		});

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
			this.runPressed()
		});

		return editor
	}

	setError(error?: string, stack?: string) {
		this.error = error
		this.errorStack = stack
		
		if (stack) {
			let matches = stack.match(/<anonymous>:[\d]+/g)
			if (!matches) {
				matches = stack.match(/ Function:[\d]+/g)
			}
			
			if (matches && matches.length > 0) {
				const rawLine = matches[0].split(":")
				if (rawLine.length > 1) {
					const line = parseInt(rawLine[1]) - 2
					this.multiplayers[0].setError({message: error, line})
				}
			}
		} else {
			this.multiplayers[0].setError(undefined)
		}

		if (this.renderCallback) {
			this.renderCallback()
		}

	}
}

export default class ThreeJSModule extends WebAudioModule<ThreeJSNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/ThreeJSProcessor.js`;

	multiplayer?: MultiplayerHandler;

	get instanceId() { return "com.sequencerParty.threejs" + this._timestamp; }

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
		await ThreeJSNode.addModules(this.audioContext, this.moduleId)

		const node: ThreeJSNode = new ThreeJSNode(this, {});
		await node._initialize();

		let analyser = this.audioContext.createAnalyser()
		node.analyser = analyser
		analyser.smoothingTimeConstant = 0.3
		node.connect(analyser)

		if (initialState) node.setState(initialState);

		await node.registerExtensions()
		await node.upload()

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

		render(<LiveCoderView plugin={this.audioNode} actions={[]}></LiveCoderView>, shadow);

		return div;
	}

	destroyGui(el: Element) {		
		render(null, el)
	}	
}
