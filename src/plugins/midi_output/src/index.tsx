/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory } from '@webaudiomodules/sdk-parammgr';
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import MIDIOutputNode from "./Node"
import { MIDIOutputView } from './MIDIOutputView';

import styles from "./MIDIOutputView.scss";
import { insertStyle} from "../../shared/insertStyle"

export default class MIDIOutputModule extends WebAudioModule<MIDIOutputNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	callback?: () => void
	midiInitialized: boolean = false
	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.midiOut" + this._timestamp; }

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
		const synthNode = new MIDIOutputNode(this.audioContext);

        const optionsIn = { internalParamsConfig: {}, paramsConfig: {}, paramsMapping: {}};

		//  @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		synthNode.setup(paramMgrNode);

		this.audioNode = synthNode

		await synthNode.initializeMidi()
	  
		if (initialState) synthNode.setState(initialState);
		return synthNode;
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

		render(<MIDIOutputView plugin={this.audioNode}></MIDIOutputView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
