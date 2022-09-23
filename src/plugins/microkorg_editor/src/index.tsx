/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { h, render } from 'preact';

import { WebAudioModule } from '@webaudiomodules/sdk';
import { getBaseUrl } from '../../shared/getBaseUrl';
import styleRoot from "./MicrokorgEditorView.scss"
import { MicrokorgEditorView } from './MicrokorgEditorView';
import { MIDIControllerNode } from './MIDIControllerNode';

export default class MicrokorgControllerModule extends WebAudioModule<MIDIControllerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/MicrokorgProcessor.js`;

	nonce: string | undefined;

	//get instanceId() { return "TomBurnsExternalInstrument" + this._timestamp; }

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);

		return descriptor
	}

	async initialize(state: any) {
		console.log("WAM::initialize")

		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		console.log("WAM::createAudioNode")

		await MIDIControllerNode.addModules(this.audioContext, this.moduleId)

		let url = `${this._processorUrl}?v=${Math.random()}`
		await this.audioContext.audioWorklet.addModule(url)

		const node: MIDIControllerNode = new MIDIControllerNode(this, {});

		await node._initialize();

		if (initialState) await node.setState(initialState);

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});

		if (this.nonce) {
			// we've already rendered before, unuse the styles before using them again
			this.nonce = undefined

			//@ts-ignore
			styleRoot.unuse()
		}

		this.nonce = Math.random().toString(16).substr(2, 8);
		div.setAttribute("data-nonce", this.nonce)

		// @ts-ignore
    	styleRoot.use({ target: shadow });

		render(<MicrokorgEditorView plugin={this.audioNode}></MicrokorgEditorView>, shadow)

		return div;
	}

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}

		render(null, el.shadowRoot)
	}
	
}



