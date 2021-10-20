/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, ParamMgrFactory, CompositeAudioNode, WamNode } from 'sdk/src';
import AudioWorkletRegister from 'sdk/src/ParamMgr/AudioWorkletRegister'
// @ts-ignore
import wamEnvProcessor from 'sdk/src/WamEnv.js'

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import {debug} from "debug"
import { SpectrumModalView } from './SpectrumModalView';
var logger = debug("plugin:modal")

export {AudioWorkletRegister}
	
class SpectrumModalNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<string>

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
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/SpectrumModalProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
	}

	async initialize(state: any) {
		await this._loadDescriptor();
		// @ts-ignore
		const AudioWorkletRegister = window.AudioWorkletRegister;
		await AudioWorkletRegister.register('__WebAudioModules_WamEnv', wamEnvProcessor, this.audioContext.audioWorklet);

		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
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
