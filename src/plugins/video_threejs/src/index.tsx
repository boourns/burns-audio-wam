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
import { ThreeJSGenerator, ThreeJSRunner } from './ThreeJSRunner';

import { VideoExtensionOptions, VideoModuleConfig } from 'wam-extensions';
import { LiveCoderNode, LiveCoderView } from '../../shared/LiveCoderView';

import { MultiplayerHandler } from '../../shared/collaboration/MultiplayerHandler';
import getThreeJSProcessor from './ThreeJSProcessor';
import { defaultScript } from './editorDefaults';

import styles from "./VideoThreeJS.module.scss"
import { insertStyle} from "../../shared/insertStyle"
import monacoStyle from "../../../../node_modules/monaco-editor/min/vs/editor/editor.main.css"

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
							this.generator.initialize(THREE, options)
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
					
					return this.runner.render(inputs, this.generator, currentTime, params, this.fftArray)
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

		try {
			let generator = new Function(source)() as ThreeJSGenerator
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
				generator.initialize(THREE, this.options)
			}
			this.generator = generator
			this.error = undefined

		} catch(e) {
			console.error("Error creating threejs generator: ", e)

			this.error = e.toString()
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
			allowJs: true
		})
	  
		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false,
		});
	
		monaco.languages.typescript.javascriptDefaults.addExtraLib(this.editorDefinition(), "")
	
		return monaco.editor.create(ref, {
			language: 'javascript',
			automaticLayout: true
		});
	}

	editorDefinition(): string {
		return `
	export type MIDINote = {
		/** MIDI Note number, 0-127 */
		note: number
		/** Note velocity, 0: off, 1-127: note on strength */
		velocity: number
		/** Note duration, measured in sequencer ticks (24 PPQN) */
		duration: number
	}
	
	export type WAMParameterDefinition = {
		/** An identifier for the parameter, unique to this plugin instance */
		id: string
		/** The parameter's human-readable name. */
		label?: string
		/** The parameter's data type */
		type?: "float" | "int"
		/** The default value for the parameter */
		defaultValue: number
		/** The lowest possible value for the parameter */
		minValue?: number
		/** The highest possible value for the parameter */
		maxValue?: number
	}
	
	export type ParameterDefinition = {
		id: string
		config: WAMParameterDefinition
	}
	
	export interface FunctionSequencer {
		parameter(): ParameterDefinition[]
		onTick(tick: number, params: Record<string, any>): MIDINote[]
	}
		`
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
