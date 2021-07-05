/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, WamNode } from 'sdk/src';
import AudioWorkletRegister from 'sdk/src/ParamMgr/AudioWorkletRegister'
// @ts-ignore
import wamEnvProcessor from 'sdk/src/WamEnv.js'

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import {debug} from "debug"

import { FunctionSeqView } from './FunctionSeqView';
var logger = debug("plugin:functionSeq")

export {AudioWorkletRegister}
	
class FunctionSeqNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<string>
	renderCallback?: (script: string | undefined, error: string | undefined) => void
	script: string

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, {...options, processorOptions: {
			numberOfInputs: 1,
			numberOfOutputs: 1,
			outputChannelCount: [2],
		}});

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}

	upload(source: string) {
		// @ts-ignore
		this.port.postMessage({action:"function", code: source})
		this.script = source
	}

	// TODO: sync idea
	// only update the getState when user presses 'Upload'
	// if user has edited the text at any point,
	//  and a new state comes in they are presented with a modal about what to do

	async getState(): Promise<any> {
		return {
			script: this.script
		}
	}

	async setState(state: any): Promise<void> {
		if (state.script !== undefined) {
			this.upload(state.script)
			if (this.renderCallback) {
				this.renderCallback(state.script, undefined)
			}
		}
	}

	/**
	 * Messages from audio thread
	 * @param {MessageEvent} message
	 * */
	 _onMessage(message: MessageEvent) {
		if (message.data && message.data.action == "error") {
			if (this.renderCallback) {
				this.renderCallback(undefined, message.data.error)
			}
		} else {
			// @ts-ignore
			super._onMessage(message)
		}
	}


}

export default class FunctionSeqModule extends WebAudioModule<WamNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_functionProcessorUrl = `${this._baseURL}/FunctionSeqProcessor.js`;
	sequencer: FunctionSeqNode

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
	}

	functionProcessor: AudioWorkletNode

	async initialize(state: any) {
		await this._loadDescriptor();
		// @ts-ignore
		const AudioWorkletRegister = window.AudioWorkletRegister;
		await AudioWorkletRegister.register('__WebAudioModules_WamEnv', wamEnvProcessor, this.audioContext.audioWorklet);
		await this.audioContext.audioWorklet.addModule(this._functionProcessorUrl)

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const node: FunctionSeqNode = new FunctionSeqNode(this, {});

		node.setState(initialState || {script:this.defaultScript()});

		this.sequencer = node

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		render(<FunctionSeqView plugin={this}></FunctionSeqView>, div);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}

	defaultScript(): string {
		return `
		
// Write code in pure ES6 javascript.
// Press "Save & Run" to load changes.  This also distributes changes to other users.
// It is loaded directly into the browser's audio thread, no transpilation occurs.
// For better error reporting check your console.

// To make a sequencer, at the end of the script return an object that responds to
// the onTick method.  This is run in the audio thread, not the main thread.

class RandomNoteSequencer {
	onTick(tick) {
		// onTick is called once every sequencer tick, which is 96 PPQN
		// it returns an array of {note, velocity, duration}
		// where note is the MIDI note number, velocity is an integer from 0 to 127, and duration is the length of the note in ticks.
		
		if (tick % 24 == 0) {
			return [
				{note: 36 + Math.floor(Math.random() * 48), velocity: 100, duration: 20}
			]
		}
	}
}

return new RandomNoteSequencer()
		
		`
	}
}
