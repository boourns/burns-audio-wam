/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory} from '@webaudiomodules/sdk-parammgr'

import SoundfontPlayerNode from './Node';
import { h, render } from 'preact';
import { SoundfontView } from './SoundfontView';
import { getBaseUrl } from '../../shared/getBaseUrl';

export default class SoundfontModule extends WebAudioModule<SoundfontPlayerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_envelopeGeneratorUrl = `${this._baseURL}/EnvelopeGeneratorProcessor.js`;
	_slewUrl = `${this._baseURL}/SlewProcessor.js`;

	synth: SoundfontPlayerNode

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
	}

	async initialize(state: any) {
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const synthNode = new SoundfontPlayerNode(this.audioContext);
		this.synth = synthNode

		const paramsConfig = {
        };
        const internalParamsConfig = {
        };

		const paramsMapping = {
		};

        const optionsIn = { internalParamsConfig, paramsConfig, paramsMapping};
		//  @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		synthNode.setup(paramMgrNode);

		if (initialState) synthNode.setState(initialState);
		return synthNode;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		render(<SoundfontView plugin={this}></SoundfontView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
