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

import styles from "./MIDIDebugView.scss"
import { insertStyle} from "../../shared/insertStyle"


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
		insertStyle(shadow, styles.toString())
		
		render(<MIDIDebugView plugin={this.audioNode}></MIDIDebugView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
