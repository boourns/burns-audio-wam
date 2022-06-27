/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule,  } from '@webaudiomodules/sdk';
import {ParamMgrFactory, CompositeAudioNode} from '@webaudiomodules/sdk-parammgr'
import DistortionNode from './Node';
import { h, render } from 'preact';
import { DistortionView } from './DistortionView';
import { getBaseUrl } from '../../shared/getBaseUrl';

export default class Distortion extends WebAudioModule<DistortionNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	flavors = ["soft", "hard"]

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
		const synthNode = new DistortionNode(this.audioContext);

		const paramsConfig = {
			overdrive: {
				defaultValue: 1,
				minValue: 1,
				maxValue: 10,
			},
			flavor: {
				defaultValue: 0,
				minValue: 0,
				maxValue: 1,
			},
			level: {
				defaultValue: 1,
				minValue: 0,
				maxValue: 2,
			},
			offset: {
				defaultValue: 0,
				minValue: 0,
				maxValue: 1,
			}
		}

        const internalParamsConfig = {
            overdrive: synthNode.overdrive.gain,
			level: synthNode.level.gain,
			offset: synthNode.offsetGain.gain,
			flavor: {
				onChange: (v: number) => { synthNode.currentFlavor = v; synthNode.updateFromState() },
				automationRate: 5
			}
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
		render(<DistortionView plugin={this}></DistortionView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
