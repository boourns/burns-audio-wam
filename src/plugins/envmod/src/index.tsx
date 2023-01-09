/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { EnvelopeFollowerView } from './EnvelopeFollowerView';
import { EnvelopeFollowerNode } from './Node';

import styles from "./EnvelopeFollowerView.scss";
import { insertStyle} from "../../shared/insertStyle"

import {ThemeUpdateListener} from "../../shared/ThemeUpdateListener"
import { WamParameterInfoMap } from '@webaudiomodules/api';

export default class EnvelopeFollowerModule extends WebAudioModule<EnvelopeFollowerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/EnvelopeFollowerProcessor.js`;
	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.envmod" + this._timestamp; }

	themeUpdateListener: ThemeUpdateListener

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	async initialize(state: any) {
		this.themeUpdateListener = new ThemeUpdateListener()
		
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await EnvelopeFollowerNode.addModules(this.audioContext, this.moduleId)

		// await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: EnvelopeFollowerNode = new EnvelopeFollowerNode(this, {})

		await node._initialize()

		node.connect(this.audioContext.destination)

		this.audioNode = node
	  
		if (initialState) node.setState(initialState);

		if (window.WAMExtensions && window.WAMExtensions.modulationTarget) {
			window.WAMExtensions.modulationTarget.setModulationTargetDelegate(this.instanceId, {
				connectModulation: async (params: WamParameterInfoMap) => {
					node.paramList = params
					if (node.targetParam) {
						await node.setTargetParameter(node.targetParam)
					}

					if (node.renderCallback) {
						node.renderCallback()
					}
				}
			})
		} else {
			console.log("did not find modulationTarget extension ", window.WAMExtensions)
		}

		return node;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")
		div.setAttribute("width", "310")
		div.setAttribute("height", "120")
		
		var shadow = div.attachShadow({mode: 'open'});
		insertStyle(shadow, styles.toString())

		this.themeUpdateListener.addTarget(this.instanceId, shadow)

		render(<EnvelopeFollowerView plugin={this.audioNode}></EnvelopeFollowerView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
