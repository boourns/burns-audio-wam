import { WebAudioModule } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { AudioRecorderNode } from './AudioRecorderNode';

import { AudioRecorderView } from './AudioRecorderView';


export default class AudioRecorderModule extends WebAudioModule<AudioRecorderNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

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
		await AudioRecorderNode.addModules(this.audioContext, this.moduleId)

		const node: AudioRecorderNode = new AudioRecorderNode(this, {});
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

		//render(<ChorderView plugin={this}></ChorderView>, div);
		render(<AudioRecorderView plugin={this}></AudioRecorderView>, div)
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}
