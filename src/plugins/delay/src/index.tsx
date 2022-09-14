/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import { ParamMgrFactory, CompositeAudioNode } from '@webaudiomodules/sdk-parammgr';

import DelayPluginNode from './Node';
import { h, render } from 'preact';
import { DelayView } from './views/DelayView';
import { getBaseUrl } from '../../shared/getBaseUrl';

import styleRoot from "./views/DelayView.scss"

export default class Delay extends WebAudioModule<DelayPluginNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	flavors = ["soft", "hard"]
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
		const synthNode = new DelayPluginNode(this.audioContext);

		const paramsConfig = {
			time: {
				defaultValue: 0.3,
				minValue: 0.001,
				maxValue: 5,
			},
			feedback: {
				defaultValue: 0.6,
				minValue: 0,
				maxValue: 1.2,
			},
			stereo: {
				defaultValue: 0,
				minValue: 0,
				maxValue: 5,
			},
			wet: {
				defaultValue: 0.3,
				minValue: 0,
				maxValue: 1,
			},
			highpass: {
				defaultValue: 0,
				minValue: 0,
				maxValue: 10000,
			},
			lowpass: {
				defaultValue: 8000,
				minValue: 0,
				maxValue: 14000,
			},
			pingpong: {
				defaultValue: 0,
				minValue: 0,
				maxValue: 1,
			},
		}

        const internalParamsConfig = {
			straightGain1: synthNode.straightGains[0].gain,
			straightGain2: synthNode.straightGains[1].gain,
			crossGain1: synthNode.crossGains[0].gain,
			crossGain2: synthNode.crossGains[1].gain,
			delay1: synthNode.delays[0].delayTime,
			delay2: synthNode.delays[1].delayTime,
			stereo: synthNode.stereoDelay.delayTime,
			wet: synthNode.wet.gain,
			dry: synthNode.dry.gain,
			feedback: synthNode.feedback.gain,
			highpass: synthNode.highpass.frequency,
			lowpass: synthNode.lowpass.frequency,
        };

		const paramsMapping = {
			time: {
				delay1: {
					sourceRange: [0.001, 5],
					targetRange: [0.001, 5]
				},
				delay2: {
					sourceRange: [0.001, 5],
					targetRange: [0.001, 5]
				}
			},
			wet: {
				wet: {
					sourceRange: [0, 1],
					targetRange: [0, 1]
				},
				dry: {
					sourceRange: [0, 1],
					targetRange: [1, 0]
				}
			},
			pingpong: {
				straightGain1: {
					sourceRange: [0, 1],
					targetRange: [1, 0]
				},
				straightGain2: {
					sourceRange: [0, 1],
					targetRange: [1, 0]
				},
				crossGain1: {
					sourceRange: [0, 1],
					targetRange: [0, 1]
				},
				crossGain2: {
					sourceRange: [0, 1],
					targetRange: [0, 1]
				},
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

		if (this.nonce) {
			// we've already rendered before, unuse the styles before using them again
			this.nonce = undefined

			//@ts-ignore
			styleRoot.unuse()
		}

		this.nonce = Math.random().toString(16).substr(2, 8);
		div.setAttribute("data-nonce", this.nonce)

		// @ts-ignore
		styleRoot.use({ target: shadow });
		
		render(<DelayView plugin={this}></DelayView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}

		render(null, el.shadowRoot)
	}
}
