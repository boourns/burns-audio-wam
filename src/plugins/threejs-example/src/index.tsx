/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, addFunctionModule } from '@webaudiomodules/sdk';
import { h, render } from 'preact';

import {WamEventMap, WamParameterDataMap} from '@webaudiomodules/api';

import { getBaseUrl } from '../../shared/getBaseUrl';

import { DynamicParameterNode, DynamicParamGroup } from "../../shared/DynamicParameterNode";
import { ThreeJSGenerator, ThreeJSRunner } from './ThreeJSRunner';

import { VideoExtensionOptions } from 'wam-extensions';
import { VideoGeneratorView } from './VideoGeneratorView';

import { MultiplayerHandler } from '../../shared/collaboration/MultiplayerHandler';
import getThreeJSProcessor from './ThreeJSProcessor';

import * as THREE from 'three';

type ThreeJSState = {
	runCount: number
	params: any
}

class ThreeJSNode extends DynamicParameterNode {
	destroyed = false;
	renderCallback?: (error: string | undefined) => void
	multiplayer?: MultiplayerHandler
	runCount: number

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

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}

	registerExtensions() {
		if (window.WAMExtensions.collaboration) {
			this.multiplayer = new MultiplayerHandler(this.instanceId, "script")
			this.multiplayer.getDocumentFromHost(this.defaultScript())

		} else {
			console.warn("host has not implemented collaboration WAM extension")
		}

		if (window.WAMExtensions && window.WAMExtensions.video) {
			window.WAMExtensions.video.setDelegate(this.instanceId, {
				connectVideo: (options: VideoExtensionOptions) => {
					console.log("connectVideo!")

					this.options = options
					this.runner = new ThreeJSRunner(options)

					if (this.generator) {
						this.generator.initialize(THREE, options)
					}

					return {
						numberOfInputs: 1,
						numberOfOutputs: 1,
					}
				},
				render: (inputs: WebGLTexture[], currentTime: number): WebGLTexture[] => {
					let offset = 0
					if (this.state && this.state.offset1) {
						offset = this.state.offset1.value
					}

					return this.runner.render(inputs, this.generator, currentTime, {offset})
				},
				disconnectVideo: () => {
					console.log("disconnectVideo")
					
					this.runner.destroy()
				},
			})
		}
	}

	upload() {
		let source = this.multiplayer.doc.toString()

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
		} catch(e) {
			console.error("Error creating threejs generator: ", e)

			if (this.renderCallback) {
				this.renderCallback(e)
			}
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

			this.upload()
		}

		if (state.params) {
			await super.setState(state.params)
		}
	}

	defaultScript(): string {
		return `

/** @implements {ThreeJSGenerator} */
class CubeGenerator {
	/**
	 * @returns {WAMParameterDefinition[]}
	 */
	parameters() {
		return [
			{
				id: "base",
				config: {
					label: "Base Note",
					type: "int",
					defaultValue: 32,
					minValue: 0,
					maxValue: 100
				}
			},
			{
				id: "range",
				config: {
					label: "Note Range",
					type: "int",
					defaultValue: 24,
					minValue: 1,
					maxValue: 48    
				}
			}
		]
	}

	initialize(THREE, options) {
		this.THREE = THREE
		this.options = options

		const camera = new THREE.PerspectiveCamera( 70, options.width / options.height, 0.01, 10 );
        camera.position.z = 1;

        const scene = new THREE.Scene();

        const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
        const material = new THREE.MeshNormalMaterial();

        const mesh = new THREE.Mesh( geometry, material );

        scene.add( mesh );

		this.scene = scene
		this.camera = camera
		this.mesh = mesh
	}

	/**
	 * @param tick {number}
	 * @param params {Record<string, any>}
	 * */
	render(renderer, time, params) {
		this.mesh.position.setX(params.offset);
		     
		this.mesh.rotation.x = (time+856) / 2;
		this.mesh.rotation.y = time / 10;
		
		renderer.render( this.scene, this.camera);
	}
}

return new CubeGenerator()
`
	}
}

export default class ThreeJSModule extends WebAudioModule<ThreeJSNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/ThreeJSProcessor.js`;

	multiplayer?: MultiplayerHandler;

	get instanceId() { return "TomBurnsThreeJSGenerator" + this._timestamp; }

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

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {		
		await ThreeJSNode.addModules(this.audioContext, this.moduleId)
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: ThreeJSNode = new ThreeJSNode(this, {});
		await node._initialize();

		if (initialState) node.setState(initialState);

		node.registerExtensions()
		node.upload()

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		render(<VideoGeneratorView plugin={this}></VideoGeneratorView>, div);
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}	
}
