/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { h, render } from 'preact';

import { WebAudioModule, addFunctionModule } from '@webaudiomodules/sdk';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { DynamicParameterNode } from '../../shared/DynamicParameterNode';

import getExternalInstrumentProcessor, { ExternalInstrumentConfig } from './ExternalInstrumentProcessor';
import { ExternalInstrumentView } from './ExternalInstrumentView';
import { InstrumentDefinition, InstrumentKernelType } from './InstrumentDefinition';
import getInstrumentKernel from './InstrumentDefinition';

import styleRoot from './ExternalInstrument.scss'
import diff from "microdiff"

const InstrumentKernel = getInstrumentKernel("test")

export class ExternalInstrumentNode extends DynamicParameterNode {
	destroyed = false;
	renderCallback?: () => void
	error?: any;

	instrumentDefinition: InstrumentDefinition
	config: ExternalInstrumentConfig
	kernel: InstrumentKernelType

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getInstrumentKernel, moduleId);
		await addFunctionModule(audioWorklet, getExternalInstrumentProcessor, moduleId);
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

		this.config = {
			channel: 0,
			midiPassThrough: "all",
			learn: true,
		}

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);

		this.instrumentDefinition = {
			controlGroups: [
				{
					label: "Controls",
					controls: [
						{
							label: "Cutoff",
							id: "cutoff",
							data: {
								dataType: "CC",
								ccNumber: 102,
								defaultValue: 64,
								minValue: 0,
								maxValue: 127
							}
						},
						{
							label: "Res",
							id: "res",
							data: {
								dataType: "CC",
								ccNumber: 103,
								defaultValue: 0,
								minValue: 0,
								maxValue: 127
							}
						}
					]
				}
			]
		}
	}

	async getState(): Promise<any> {
		return {
			params: await super.getState(),
			definition: this.instrumentDefinition,
		}
	}

	async setState(state: any): Promise<void> {
		if (state.params) {
			await super.setState(state.params)
		}
		if (state.definition) {
			const changes = diff(this.instrumentDefinition, state.definition)
			if (changes.length > 0) {
				this.instrumentDefinition = state.definition
				this.updateProcessorFromDefinition()
			}
		}
	}

	registerExtensions() {
		
	}

	updateProcessorFromDefinition() {
        super.port.postMessage({source:"def", def: this.instrumentDefinition})

		this.kernel = new InstrumentKernel(this.instrumentDefinition, 0)

		this.updateProcessor(this.kernel.toWAM())

		if (this.renderCallback) {
			this.renderCallback()
		}
	}

	_onMessage(message: MessageEvent) {
		if (message.data && message.data.source == "kernel") {
			console.log("Received kernel message: ", JSON.stringify(message))
			if (message.data.type == "learn") {
				// data: {
				// 	cc: event.bytes[1],
				// 	value: event.bytes[2]
				// }
				if (!this.kernel.existingControlForCC(message.data.data.cc) && this.config.learn) {
					this.instrumentDefinition.controlGroups[this.instrumentDefinition.controlGroups.length-1].controls.push({
						id: `cc${message.data.data.cc}`,
						label: `CC${message.data.data.cc}`,
						data: {
							dataType: 'CC',
							ccNumber: message.data.data.cc,
							defaultValue: message.data.data.value,
							minValue: 0,
							maxValue: 127,
						}
					})

					this.updateProcessorFromDefinition()
				}
			}
		} else {
			super._onMessage(message)
		}
	}
}

export default class ExternalInstrumentModule extends WebAudioModule<ExternalInstrumentNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.externalInstrument" + this._timestamp; }

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);

		return descriptor
	}

	async initialize(state: any) {
		console.log("WAM::initialize")

		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		console.log("WAM::createAudioNode")

		await ExternalInstrumentNode.addModules(this.audioContext, this.moduleId)
		const node: ExternalInstrumentNode = new ExternalInstrumentNode(this, {});

		await node._initialize();

		if (initialState) await node.setState(initialState);

		node.registerExtensions()
		node.updateProcessorFromDefinition()

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")

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

		render(<ExternalInstrumentView plugin={this.audioNode}></ExternalInstrumentView>, shadow);

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



