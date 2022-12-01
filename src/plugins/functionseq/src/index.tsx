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

import { defaultScript, editorDefinition } from './editor';

import styleRoot from "./FunctionSequencer.scss"
import { NoteDefinition } from 'wam-extensions';
	
type FunctionSeqState = {
	runCount: number
	params: any
}

class FunctionSeqNode extends DynamicParameterNode implements LiveCoderNode {
	destroyed = false;
	renderCallback?: () => void
	multiplayers: MultiplayerHandler[]
	runCount: number
	error?: any;

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		await super.addModules(audioContext, moduleId);
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
		this.multiplayers = []

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	registerExtensions() {
		if (window.WAMExtensions.collaboration) {
			this.multiplayers = [new MultiplayerHandler(this.instanceId, "script", "Code")]
			this.multiplayers[0].getDocumentFromHost(this.defaultScript())

			this.upload()
		} else {
			console.warn("host has not implemented collaboration WAM extension")
		}

		if (window.WAMExtensions.notes) {
			window.WAMExtensions.notes.addListener(this.instanceId, (notes?: NoteDefinition[]) => {
				this.port.postMessage({source: "function", action: "noteList", noteList: notes})
			})
		}
	}

	createEditor(ref: HTMLDivElement): monaco.editor.IStandaloneCodeEditor {	
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			allowJs: true,
			checkJs: true,
			alwaysStrict: true,
		})
	
		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false,
		});

		const libUriString = 'ts:filename/functionSequencer.d.ts'
		const libUri = monaco.Uri.parse(libUriString)

		if (!monaco.editor.getModel(libUri)) {
			const libSource = this.editorDefinition()
			monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUriString)
			
			monaco.editor.createModel(libSource, 'typescript', libUri);
		}

		let editor = monaco.editor.create(ref, {
			language: 'javascript',
			automaticLayout: true
		});	

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
			this.upload()
		});

		return editor
	}

	upload() {
		if (this.multiplayers.length > 0) {
			let source = this.multiplayers[0].doc.toString()
			this.port.postMessage({source:"function", action:"function", code: source})
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
			if (message.data.action == "newParams" && message.data.params) {
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
			} else if (message.data.action == "error") {
				this.error = message.data.error
			} else if (message.data.action == "noteList") {
				if (window.WAMExtensions.notes) {
					window.WAMExtensions.notes.setNoteList(this.instanceId, message.data.noteList)
				}
			}
			if (this.renderCallback) {
				this.renderCallback()
			}
		} else if (message.data && message.data.source == "") {

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
	_processorUrl = `${this._baseURL}/FunctionSeqProcessor.js`;

	sequencer: FunctionSeqNode
	nonce: string | undefined;

	get instanceId() { return "com.sequencerParty.functionSeq" + this._timestamp; }

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

		let url = `${this._processorUrl}?v=${Math.random()}`
		await this.audioContext.audioWorklet.addModule(url)

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
		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		if (this.nonce) {
			// we've already rendered before, unuse the styles before using them again
			this.nonce = undefined

			//@ts-ignore
			styleRoot.unuse()
		}

		this.nonce = Math.random().toString(16).substr(2, 8);
		div.setAttribute("data-nonce", this.nonce)

		// @ts-ignore
		styleRoot.use({ target: div });

		render(<LiveCoderView plugin={this.audioNode} actions={[]}></LiveCoderView>, div);

		return div;
	}

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}

		render(null, el)
	}


}



