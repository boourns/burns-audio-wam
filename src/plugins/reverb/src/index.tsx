/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory } from '@webaudiomodules/sdk-parammgr'
import ConvolutionReverbNode from './Node';
import { h, render } from 'preact';
import { ConvolutionReverbView } from './ReverbView';
import { getBaseUrl } from '../../shared/getBaseUrl';

import styles from "./ReverbView.scss"
import { insertStyle} from "../../shared/insertStyle"

export default class ConvolutionReverb extends WebAudioModule<ConvolutionReverbNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	nonce: string | undefined;

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
		const synthNode = new ConvolutionReverbNode(this.audioContext, this._baseURL);

		const paramsConfig = {
			wet: {
				defaultValue: 0.3,
				minValue: 0,
				maxValue: 1
			}
		}

        const internalParamsConfig = {
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
		insertStyle(shadow, styles.toString())

		render(<ConvolutionReverbView plugin={this}></ConvolutionReverbView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
