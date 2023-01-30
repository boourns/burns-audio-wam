/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { h, render } from 'preact';

import { WebAudioModule } from '@webaudiomodules/sdk';
import { getBaseUrl } from '../../shared/getBaseUrl';
import styles from "./OB6EditorView.scss"
import { insertStyle} from "../../shared/insertStyle"

import { OB6EditorView } from './OB6EditorView';
import { MIDIControllerNode } from '../../shared/midi/MIDIControllerNode';

export default class OB6ControllerModule extends WebAudioModule<MIDIControllerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/OB6Processor.js`;

	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.ob6" + this._timestamp; }

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

		render(<OB6EditorView plugin={this.audioNode}></OB6EditorView>, shadow)

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
	
}



