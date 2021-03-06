/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import * as monaco from 'monaco-editor';
import { h, render } from 'preact';

import { WebAudioModule, addFunctionModule } from '@webaudiomodules/sdk';
import {WamParameterDataMap} from '@webaudiomodules/api';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { MultiplayerHandler } from '../../shared/collaboration/MultiplayerHandler';
import { DynamicParameterNode } from '../../shared/DynamicParameterNode';
import { LiveCoderNode, LiveCoderView } from "../../shared/LiveCoderView"

import getFunctionSequencerProcessor from './FunctionSeqProcessor';
import { defaultScript, editorDefinition } from './editor';
	
type FunctionSeqState = {
	runCount: number
	params: any
}

class FunctionSeqNode extends DynamicParameterNode implements LiveCoderNode {
	destroyed = false;
	renderCallback?: () => void
	multiplayer?: MultiplayerHandler
	runCount: number
	error?: any;

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

	registerExtensions() {
		if (window.WAMExtensions.collaboration) {
			this.multiplayer = new MultiplayerHandler(this.instanceId, "script")
			this.multiplayer.getDocumentFromHost(this.defaultScript())

			this.upload()
		} else {
			console.warn("host has not implemented collaboration WAM extension")
		}
	}

	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor {
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			allowJs: true
		})
	  
		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false,
		});
	
		monaco.languages.typescript.javascriptDefaults.addExtraLib(this.editorDefinition(), "")
	
		return monaco.editor.create(ref, {
			language: 'javascript',
			automaticLayout: true
		});	
	}

	upload() {
		if (this.multiplayer) {
			let source = this.multiplayer.doc.toString()
			this.port.postMessage({action:"function", code: source})
		}
	}

	async runPressed() {
		this.setState({
			runCount: this.runCount+1
		})
	}

	async getState(): Promise<FunctionSeqState> {
		return {
			runCount: this.runCount,
			params: await super.getState()
		}
	}

	async setState(state?: Partial<FunctionSeqState>): Promise<void> {
		if (!state) {
			return
		}

		if (state.runCount && state.runCount != this.runCount) {
			this.runCount = state.runCount

			this.upload()
		}

		if (state.params) {
			await super.setState(state.params)
		}
	}

	/**
	 * Messages from audio thread
	 * @param {MessageEvent} message
	 * */
	 _onMessage(message: MessageEvent) {
		if (message.data && message.data.source == "functionSeq") {
			if (message.data.params) {
				this.groupedParameters = [
					{
						name: "Parameters",
						params: message.data.params
					}
				]

				let state: WamParameterDataMap = {}

				for (let g of this.groupedParameters) {
					for (let p of g.params) {
						state[p.id] = {id: p.id, value: p.config.defaultValue ?? 0, normalized: false}
					}
				}

				this.state = state
			}
			this.error = message.data.error
			if (this.renderCallback) {
				this.renderCallback()
			}
		} else {
			// @ts-ignore
			super._onMessage(message)
		}
	}

	defaultScript(): string {
		return defaultScript()
	}

	editorDefinition(): string {
		return editorDefinition()
	}

}

export default class FunctionSeqModule extends WebAudioModule<FunctionSeqNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_functionProcessorUrl = `${this._baseURL}/FunctionSeqProcessor.js`;
	sequencer: FunctionSeqNode

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

		node.setState(initialState || {
			runCount: 0
		});

		node.registerExtensions()
		node.upload()

		this.sequencer = node

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		render(<LiveCoderView plugin={this.audioNode}></LiveCoderView>, div);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}


}



