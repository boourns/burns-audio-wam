/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory } from '@webaudiomodules/sdk-parammgr';
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { ButterchurnView } from './ButterchurnView';

import styleRoot from "./MIDIOutputView.scss";
import ButterchurnNode from './Node';

import { VideoExtensionOptions, VideoModuleConfig } from 'wam-extensions';

export default class ButterchurnModule extends WebAudioModule<ButterchurnNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	callback?: () => void
	audioInitialized: boolean = false

	nonce: string | undefined;

	get instanceId() { return "SequencerPartyButterchurn" + this._timestamp; }

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
		const synthNode = new ButterchurnNode(this.audioContext);

        const optionsIn = { internalParamsConfig: {}, paramsConfig: {}, paramsMapping: {}};

		//  @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		synthNode.setup(paramMgrNode);

		this.audioNode = synthNode

		if (initialState) synthNode.setState(initialState);

		if (window.WAMExtensions && window.WAMExtensions.video) {
			window.WAMExtensions.video.setDelegate(this.instanceId, {
				connectVideo: (options: VideoExtensionOptions) => {
					console.log("connectVideo!")

					this.audioNode.setVideoOptions(options)
				},
				config: () => {
					return {
						numberOfInputs: 0,
						numberOfOutputs: 1,
					}
				},
				render: (inputs: WebGLTexture[], currentTime: number) => {
					return this._audioNode.render(inputs, currentTime)
				},
				disconnectVideo: () => {
					console.log("disconnectVideo")
				},
			})
		}

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
		// @ts-ignore
		styleRoot.use({ target: shadow });

		render(<ButterchurnView plugin={this.audioNode}></ButterchurnView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		//@ts-ignore
		styleRoot.unuse()

		render(null, el.shadowRoot)
	}
}
