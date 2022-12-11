/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { MIDIInputView } from './MIDIInputView';
import { MIDIInputNode } from './Node';

import styles from "./MIDIInputView.scss";
import { insertStyle} from "../../shared/insertStyle"

import {ThemeUpdateListener} from "../../shared/ThemeUpdateListener"

export default class MIDIInputModule extends WebAudioModule<MIDIInputNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/MIDIInputProcessor.js`;
	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.MIDIIn" + this._timestamp; }

	themeUpdateListener: ThemeUpdateListener

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	async initialize(state: any) {
		this.themeUpdateListener = new ThemeUpdateListener()
		
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await MIDIInputNode.addModules(this.audioContext, this.moduleId)
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: MIDIInputNode = new MIDIInputNode(this, {})

		await node._initialize()

		this.audioNode = node

		await node.initializeMidi()
	  
		if (initialState) node.setState(initialState);
		return node;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")
		div.setAttribute("width", "320")
		div.setAttribute("height", "240")
		
		var shadow = div.attachShadow({mode: 'open'});
		insertStyle(shadow, styles.toString())

		this.themeUpdateListener.addTarget(this.instanceId, shadow)

		render(<MIDIInputView plugin={this.audioNode}></MIDIInputView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
