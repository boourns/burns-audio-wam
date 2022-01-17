/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WamEventMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import getSpectrumModalProcessor from "./SpectrumModalProcessor"

import { SpectrumModalView } from './SpectrumModalView';
	
class SpectrumModalNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, {
			...options, 
			numberOfInputs: 0,
			numberOfOutputs: 1,
			outputChannelCount: [2],
		});

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
		this.channelCountMode = "explicit"

	}
}

export default class SpectrumModalModule extends WebAudioModule<WamNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_coreUrl = `${this._baseURL}/SpectrumModalCore.js`;

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
		await SpectrumModalNode.addModules(this.audioContext, this.moduleId)

		await this.audioContext.audioWorklet.addModule(this._coreUrl)
		
		await addFunctionModule(this.audioContext.audioWorklet, getSpectrumModalProcessor, this.moduleId)

		const node: SpectrumModalNode = new SpectrumModalNode(this, {});
		await node._initialize()

		if (initialState) node.setState(initialState);

		return node
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

		render(<SpectrumModalView plugin={this}></SpectrumModalView>, div);
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}
