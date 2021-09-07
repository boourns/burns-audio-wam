/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, ParamMgrFactory, CompositeAudioNode } from 'sdk';
import ConvolutionReverbNode from './Node';
import { h, render } from 'preact';
import { ConvolutionReverbView } from './ReverbView';
import { getBaseUrl } from '../../shared/getBaseUrl';

export default class ConvolutionReverb extends WebAudioModule<ConvolutionReverbNode> {
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
		const synthNode = new ConvolutionReverbNode(this.audioContext, this._baseURL);

		const paramsConfig = {
			time: {
				defaultValue: 1,
				minValue: 0.001,
				maxValue: 40,
			},
			wet: {
				defaultValue: 0.3,
				minValue: 0,
				maxValue: 1
			}
		}

        const internalParamsConfig = {
            overdrive: {
				onChange: (v: number) => { synthNode.state.reverbTime = v; synthNode.updateFromState() }
			},
			wet: synthNode.wet.gain,
			dry: synthNode.dry.gain
        };

		const paramsMapping = {
			wet: {
				wet: {
					sourceRange: [0, 1],
					targetRange: [0, 1],
				},
				dry: {
					sourceRange: [0, 1],
					targetRange: [1, 0],
				}
			}
		}

        const optionsIn = { internalParamsConfig, paramsConfig, paramsMapping };

		// @ts-ignore
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
		render(<ConvolutionReverbView plugin={this}></ConvolutionReverbView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
