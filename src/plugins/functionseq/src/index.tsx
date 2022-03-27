/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import * as monaco from 'monaco-editor';

import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import { h, render } from 'preact';

import {WamEventMap} from '@webaudiomodules/api';

import { getBaseUrl } from '../../shared/getBaseUrl';

import { FunctionSeqView } from './FunctionSeqView';
import getFunctionSequencerProcessor from './FunctionSeqProcessor';

import { MultiplayerHandler } from '../../shared/collaboration/MultiplayerHandler';
import { DynamicParameterNode } from '../../shared/DynamicParameterNode';
	
type FunctionSeqState = {
	runCount: number
}

class FunctionSeqNode extends DynamicParameterNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>
	renderCallback?: (error: string | undefined) => void
	multiplayer?: MultiplayerHandler
	runCount: number

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getFunctionSequencerProcessor, moduleId);
	}

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, 
			{...options, processorOptions: {
				numberOfInputs: 1,
				numberOfOutputs: 1,
				outputChannelCount: [2],
			}}, 
		[]);

		this.runCount = 0

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	upload() {
		let source = this.multiplayer.doc.toString()

		this.port.postMessage({action:"function", code: source})
	}

	async runPressed() {
		this.setState({
			runCount: this.runCount+1
		})
	}

	async getState(): Promise<FunctionSeqState> {
		return {
			runCount: this.runCount
		}
	}

	async setState(state?: FunctionSeqState): Promise<void> {
		if (!state || !state.runCount) {
			return
		}

		if (state.runCount != this.runCount) {
			this.runCount = state.runCount

			this.upload()
		}
	}

	/**
	 * Messages from audio thread
	 * @param {MessageEvent} message
	 * */
	 _onMessage(message: MessageEvent) {
		if (message.data && message.data.action == "error") {
			if (this.renderCallback) {
				this.renderCallback(message.data.error)
			}
		} else {
			// @ts-ignore
			super._onMessage(message)
		}
	}
}

export default class FunctionSeqModule extends WebAudioModule<FunctionSeqNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_functionProcessorUrl = `${this._baseURL}/FunctionSeqProcessor.js`;
	sequencer: FunctionSeqNode
	multiplayer?: MultiplayerHandler;

	get instanceId() { return "TomBurnsFunctionSequencer" + this._timestamp; }

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);

		return descriptor
	}

	configureMonaco() {
		const baseURL = this._baseURL
		// @ts-ignore
		self.MonacoEnvironment = {
			getWorkerUrl: function (moduleId: any, label: string) {
				if (label === 'json') {
					return `${baseURL}/monaco/json.worker.bundle.js`;
				}
				if (label === 'css' || label === 'scss' || label === 'less') {
					return `${baseURL}/monaco/css.worker.bundle.js`;
				}
				if (label === 'html' || label === 'handlebars' || label === 'razor') {
					return `${baseURL}/monaco/html.worker.bundle.js`;
				}
				if (label === 'typescript' || label === 'javascript') {
					return `${baseURL}/monaco/ts.worker.bundle.js`;
				}
				return `${baseURL}/monaco/editor.worker.bundle.js`;
			}
		}
	}

	async initialize(state: any) {
		await this._loadDescriptor();
		this.configureMonaco();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await FunctionSeqNode.addModules(this.audioContext, this.moduleId)
		const node: FunctionSeqNode = new FunctionSeqNode(this, {});
		await node._initialize();

		if (window.WAMExtensions.collaboration) {
			this.multiplayer = new MultiplayerHandler(this.instanceId, "script")
			this.multiplayer.getDocumentFromHost(this.defaultScript())

			node.multiplayer = this.multiplayer
		} else {
			console.warn("host has not implemented collaboration WAM extension")
		}

		node.setState(initialState || {
			runCount: 0
		});

		node.upload()

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

/** @implements {FunctionSequencer} */
class RandomNoteSequencer {

	/**
	 * @param tick {number}
	 * */
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
