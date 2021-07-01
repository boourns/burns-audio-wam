/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, ParamMgrFactory, CompositeAudioNode } from '../../sdk';
import LFONode from './Node';
import { h, render } from 'preact';
import { LFOView } from './LFOView';
import { getBaseUrl } from '../../shared/getBaseUrl';

export default class LFO extends WebAudioModule<LFONode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
	}

	async initialize(state: any) {
		await this._loadDescriptor();
		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const lfoNode = new LFONode(this.audioContext);

		const paramsConfig = {
			frequency: {
				defaultValue: 1,
				minValue: 0.001,
				maxValue: 40,
			},
			gain: {
				defaultValue: 0.3,
				minValue: 0,
				maxValue: 1,
			},
		}

        const internalParamsConfig = {
			frequency: lfoNode.oscillator.frequency,
			gain: lfoNode.output.gain,
        };

		const paramsMapping = {
		}

        const optionsIn = { internalParamsConfig, paramsConfig, paramsMapping };

		// @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		lfoNode.setup(paramMgrNode);

		if (initialState) lfoNode.setState(initialState);
		return lfoNode;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		render(<LFOView plugin={this}></LFOView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
