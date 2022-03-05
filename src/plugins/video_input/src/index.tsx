/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory } from '@webaudiomodules/sdk-parammgr'
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { AudioInputView } from './AudioInputView';
import VideoInputNode from './Node';

export default class VideoInputModule extends WebAudioModule<VideoInputNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

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
		const synthNode = new VideoInputNode(this.audioContext as AudioContext, this._baseURL);

		// @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, {});
		synthNode.setup(paramMgrNode);

		await synthNode.createNodes();


		if (initialState) synthNode.setState(initialState);
		return synthNode;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		render(<AudioInputView plugin={this}></AudioInputView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
