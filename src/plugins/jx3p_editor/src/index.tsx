/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { h, render } from 'preact';

import { WebAudioModule } from '@webaudiomodules/sdk';
import { getBaseUrl } from '../../shared/getBaseUrl';
import styles from "./JX3PEditorView.scss"
import { insertStyle} from "../../shared/insertStyle"

import { JX3PEditorView } from './JX3PEditorView';
import { MIDIControllerNode } from '../../shared/midi/MIDIControllerNode';

export default class JX3PControllerModule extends WebAudioModule<MIDIControllerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/JX3PProcessor.js`;

	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.jx3p" + this._timestamp; }

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
		insertStyle(shadow, styles.toString())

		render(<JX3PEditorView plugin={this.audioNode}></JX3PEditorView>, shadow)

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
	
}



