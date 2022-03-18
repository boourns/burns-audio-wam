/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, WamNode } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { DynamicParameterNode } from "../../shared/DynamicParameterNode";

import { VideoExtensionOptions } from 'wam-extensions';
import { DynamicParameterView } from '../../shared/DynamicParameterView';
import { ISFShader } from './ISFShader';
	
class ISFVideoNode extends DynamicParameterNode {
	destroyed = false;

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

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}
	
}

export default class ISFVideoModule extends WebAudioModule<ISFVideoNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/ISFVideoProcessor.js`;

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
		await ISFVideoNode.addModules(this.audioContext, this.moduleId)
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: ISFVideoNode = new ISFVideoNode(this, {});
		await node._initialize();

		await node.updateState();

		if (initialState) node.setState(initialState);

		if (window.WAMExtensions && window.WAMExtensions.video) {
			window.WAMExtensions.video.setDelegate(this.instanceId, {
				connectVideo: (options: VideoExtensionOptions) => {
					console.log("connectVideo!")
					this.attach(options)
					return {
						numberOfInputs: 1,
						numberOfOutputs: 1
					}
				},
				render: (inputs: WebGLTexture[], currentTime: number) => {
					return this.generator.render(inputs, currentTime, this._audioNode.state)
				},
				disconnectVideo: () => {
					console.log("disconnectVideo")
				},
			})
		}

		return node
    }

	gl: WebGLRenderingContext
	generator: ISFShader

	attach(options: VideoExtensionOptions) {
		this.generator = new ISFShader(options, "", undefined)
		let params = this.generator.wamParameters()

		this._audioNode.updateProcessor(params)
	}

	// Random color helper function.
	getRandomColor() {
		return [Math.random(), Math.random(), Math.random()];
	}
	

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		//var shadow = div.attachShadow({mode: 'open'});
		//const container = document.createElement('div');
		//container.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")
		
		//shadow.appendChild(container)

		render(<DynamicParameterView plugin={this._audioNode}></DynamicParameterView>, div);
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}
