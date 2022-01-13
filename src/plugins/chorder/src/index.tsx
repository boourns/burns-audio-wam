import { WamEventMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { ChorderView } from './ChorderView';
	
class ChorderNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, {...options, processorOptions: {
			numberOfInputs: 1,
			numberOfOutputs: 1,
			outputChannelCount: [2],
		}});

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}
}

export default class ChorderModule extends WebAudioModule<WamNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/ChorderProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);

		return descriptor
	}

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		// @ts-ignore TODO why?
		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getChorderProcessor, moduleId);
	}

	async initialize(state: any) {
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const node: ChorderNode = new ChorderNode(this, {});
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

		render(<ChorderView plugin={this}></ChorderView>, div);
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}
