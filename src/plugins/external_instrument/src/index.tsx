/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { h, render } from 'preact';

import { WebAudioModule, addFunctionModule } from '@webaudiomodules/sdk';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { DynamicParameterNode, DynamicParamGroup } from '../../shared/DynamicParameterNode';

import getExternalInstrumentProcessor from './ExternalInstrumentProcessor';
import { ExternalInstrumentView } from './ExternalInstrumentView';
import { InstrumentDefinition } from './InstrumentDefinition';
import getInstrumentKernel from './InstrumentDefinition';

const InstrumentKernel = getInstrumentKernel("test")

export class ExternalInstrumentNode extends DynamicParameterNode {
	destroyed = false;
	renderCallback?: () => void
	error?: any;

	instrumentDefinition: InstrumentDefinition

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

	registerExtensions() {
		
	}

	updateProcessorFromDefinition() {
        super.port.postMessage({source:"def", def: this.instrumentDefinition})

		let kernel = new InstrumentKernel(this.instrumentDefinition, 0)

		this.updateProcessor(kernel.toWAM())
	}

	_onMessage(message: MessageEvent) {
		if (message.data && message.data.source == "kernel") {
			console.log("Received kernel message: ", JSON.stringify(message))
		} else {
			super._onMessage(message)
		}
	}
}

export default class ExternalInstrumentModule extends WebAudioModule<ExternalInstrumentNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	get instanceId() { return "TomBurnsExternalInstrument" + this._timestamp; }

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
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		render(<ExternalInstrumentView plugin={this.audioNode}></ExternalInstrumentView>, div);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
	
}



