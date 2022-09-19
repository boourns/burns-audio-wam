/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { MIDIDebugView } from './MIDIDebugView';
import { MIDIDebugNode as MIDIDebugNode } from './Node';
import styleRoot from "./MIDIDebugView.scss"


export default class MIDIDebugModule extends WebAudioModule<MIDIDebugNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	callback?: () => void
	midiInitialized: boolean = false
	nonce: string | undefined;

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
		await MIDIDebugNode.addModules(this.audioContext, this.moduleId)

		const node: MIDIDebugNode = new MIDIDebugNode(this, {})

		await node._initialize()

		this.audioNode = node
	  
		if (initialState) node.setState(initialState);
		return node;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")
		div.setAttribute("width", "800")
		div.setAttribute("height", "500")

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

		render(<MIDIDebugView plugin={this.audioNode}></MIDIDebugView>, shadow);

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
