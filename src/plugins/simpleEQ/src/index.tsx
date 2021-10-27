/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory} from '@webaudiomodules/sdk-parammgr'
import SimpleEQNode from './Node';
import { h, render } from 'preact';
import { SimpleEQView } from './SimpleEQView';
import { getBaseUrl } from '../../shared/getBaseUrl';

export default class SimpleEQ extends WebAudioModule<SimpleEQNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

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
		const synthNode = new SimpleEQNode(this.audioContext);

		const paramsConfig = {
			lowGain: {
				defaultValue: 0,
				minValue: -40,
				maxValue: 40,
			},
            lowFrequency: {
				defaultValue: 200,
				minValue: 20,
				maxValue: 400,
			},
            mediumGain: {
				defaultValue: 0,
				minValue: -40,
				maxValue: 40,
			},
            mediumFrequency: {
				defaultValue: 2000,
				minValue: 200,
				maxValue: 8000,
			},
            mediumQuality: {
				defaultValue: 0.5,
				minValue: 0,
				maxValue: 1.0
			},
            highGain: {
				defaultValue: 0,
				minValue: -40,
				maxValue: 40,
			},
            highFrequency: {
				defaultValue: 8000,
				minValue: 6000,
				maxValue: 12000,
			},
		}

        const internalParamsConfig = {
            lowGain: synthNode.lowFilter.gain,
			lowFrequency: synthNode.lowFilter.frequency,
			mediumGain: synthNode.mediumFilter.gain,
			mediumFrequency: synthNode.mediumFilter.frequency,
			mediumQuality: synthNode.mediumFilter.Q,
			highGain: synthNode.highFilter.gain,
			highFrequency: synthNode.highFilter.frequency
        };

        const optionsIn = { internalParamsConfig, paramsConfig };
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
		render(<SimpleEQView plugin={this}></SimpleEQView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
