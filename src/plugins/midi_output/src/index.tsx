/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory } from '@webaudiomodules/sdk-parammgr';
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import MIDIOutputNode from "./Node"
import { MIDIOutputView } from './MIDIOutputView';

export default class MIDIOutputModule extends WebAudioModule<MIDIOutputNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	callback?: () => void
	midiInitialized: boolean = false

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
		const synthNode = new MIDIOutputNode(this.audioContext);

        const optionsIn = { internalParamsConfig: {}, paramsConfig: {}, paramsMapping: {}};

		//  @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		synthNode.setup(paramMgrNode);

		this.audioNode = synthNode

		try {
			let midi = await navigator.requestMIDIAccess()
			midi.addEventListener('statechange', (event: WebMidi.MIDIConnectionEvent) => this.midiReady(event.target as WebMidi.MIDIAccess));

			this.midiReady(midi)
		} catch (err) {
			console.log('Error accessing MIDI devices: ', err);
		}	  
	  
		if (initialState) synthNode.setState(initialState);
		return synthNode;
    }

	midiReady(midi: WebMidi.MIDIAccess) {
		// Reset.
		this.audioNode.midiIn = [];
		this.audioNode.midiOut = [];
		this.audioNode.selectedMIDIOutput = -1;
		
		// MIDI devices that send you data.
		const inputs = midi.inputs.values();
		for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
			this.audioNode.midiIn.push(input.value);
		}
		
		// MIDI devices that you send data to.
		const outputs = midi.outputs.values();
		for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
			this.audioNode.midiOut.push(output.value);
		}

		this.midiInitialized = true

		if (this.callback) {
			this.callback()
		}
	}

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		let initialState = await this.audioNode.getParameterValues()
		render(<MIDIOutputView plugin={this}></MIDIOutputView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el.shadowRoot)
	}
}
