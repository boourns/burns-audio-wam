/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, ParamMgrFactory, CompositeAudioNode } from 'sdk';
import Synth101Node from './Node';
import { h, render } from 'preact';
import { SynthView } from './SynthView';
import { getBaseUrl } from '../../shared/getBaseUrl';

let lfoWaves: OscillatorType[] = ["triangle", "square"]
let ranges = ["32'", "16'", "8'", "4'"]
let pwms = ["LFO", "Manual", "Env"]
let subRanges = ["-10ct", "-20ct pulse", "-20ct sine", "-20ct tri"]
let vcaSources = ["Env", "Gate"]
let portamentoModes = ["Off", "Auto", "On"]

export default class Synth101 extends WebAudioModule<Synth101Node> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_envelopeGeneratorUrl = `${this._baseURL}/EnvelopeGeneratorProcessor.js`;
	_slewUrl = `${this._baseURL}/SlewProcessor.js`;

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
		const synthNode = new Synth101Node(this.audioContext);

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
		render(<div>Soundfont player</div>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
