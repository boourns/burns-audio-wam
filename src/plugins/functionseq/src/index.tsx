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
import { DocumentHandler as DocumentHandler } from '../../shared/collaboration/DocumentHandler';
import { DynamicParameterNode } from '../../shared/DynamicParameterNode';
import { LiveCoderNode, LiveCoderView } from "../../shared/LiveCoderView"

import { defaultScript, editorDefinition } from './editor';

import styles from "./FunctionSequencer.module.scss"
import { insertStyle} from "../../shared/insertStyle"
import monacoStyle from "../../../../node_modules/monaco-editor/min/vs/editor/editor.main.css"

import { NoteDefinition } from 'wam-extensions';
import { RemoteUIElement } from './RemoteUI';
import { DynamicParameterView } from '../../shared/DynamicParameterView';
import { RemoteUIRenderer } from './RemoteUIRenderer';
import { RemoteUIReceiver } from './RemoteUIReceiver';
	
type FunctionSeqState = {
	runCount: number
	params: any
	additionalState: Record<string, any>
	singlePlayerSource?: string
}

class FunctionSeqNode extends DynamicParameterNode implements LiveCoderNode {
	destroyed = false;
	renderCallback?: () => void
	multiplayers: DocumentHandler[]
	runCount: number
	error?: string;
	errorStack?: string;

	uiReceiver: RemoteUIReceiver;
	additionalState: Record<string, any>
	singlePlayerMode = false

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
		this.uiReceiver = new RemoteUIReceiver(this.port)
		this.additionalState = {}

		if (!window.WAMExtensions || !window.WAMExtensions.collaboration) {
			this.singlePlayerMode = true
		}

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	async registerExtensions() {
		this.multiplayers = [new DocumentHandler(this.instanceId, "script", "Code")]
		await this.multiplayers[0].getDocumentFromHost(this.defaultScript())

		await this.upload()

		if (window.WAMExtensions && window.WAMExtensions.notes) {
			window.WAMExtensions.notes.addListener(this.instanceId, (notes?: NoteDefinition[]) => {
				this.port.postMessage({source: "function", action: "noteList", noteList: notes})
			})
		}

		if (window.WAMExtensions && window.WAMExtensions.runPreset) {
			window.WAMExtensions.runPreset.register(this.instanceId, {
				runPreset: () => {
					this.additionalState = {}
					this.upload()
				}
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
			this.runPressed()
		});

		return editor
	}

	async upload() {
		if (this.multiplayers.length > 0) {
			let source = await this.multiplayers[0].toString()
			this.error = undefined
			this.multiplayers[0].setError(undefined)
			this.port.postMessage({source:"function", action:"function", code: source})
		}
	}

	uploadAdditionalState() {
		this.port.postMessage({source:"function", action: "additionalState", state: this.additionalState})
	}

	async runPressed() {
		this.setState({
			runCount: this.runCount+1
		})
	}

	async getState(): Promise<FunctionSeqState> {
		const state = {
			runCount: this.runCount,
			params: await super.getState(),
			additionalState: {...this.additionalState},
			singlePlayerSource: this.singlePlayerMode ? await this.multiplayers[0].toString() : undefined
		}

		return state
	}

	async setState(state?: Partial<FunctionSeqState>): Promise<void> {
		if (!state) {
			return
		}

		var uploadNeeded = false

		if (this.singlePlayerMode && state.singlePlayerSource) {
			this.multiplayers[0].setSinglePlayerDocumentSource(state.singlePlayerSource)
			uploadNeeded = true
		}

		if (state.runCount && state.runCount != this.runCount) {
			this.runCount = state.runCount
			uploadNeeded = true
		}

		if (uploadNeeded) {
			this.upload()
		}

		if (state.additionalState) {
			this.additionalState = {...state.additionalState}
			this.uploadAdditionalState()
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
				this.setError(message.data.error, message.data.stack)
			} else if (message.data.action == "noteList") {
				if (window.WAMExtensions.notes) {
					window.WAMExtensions.notes.setNoteList(this.instanceId, message.data.noteList)
				}
			} else if (message.data.action == "additionalState") {
				this.additionalState = message.data.state
			}
			if (this.renderCallback) {
				this.renderCallback()
			}
		} else if (message.data && message.data.source == "remoteUI") {
			if (this.uiReceiver.onMessage(message)) {
				if (this.renderCallback) {
					this.renderCallback()
				}
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

	setError(error?: string, stack?: string) {
		this.error = error
		this.errorStack = stack
		
		if (stack) {
			let matches = stack.match(/<anonymous>:[\d]+/g)
			if (!matches) {
				matches = stack.match(/ Function:[\d]+/g)
			}
			
			if (matches && matches.length > 0) {
				const rawLine = matches[0].split(":")
				if (rawLine.length > 1) {
					const line = parseInt(rawLine[1]) - 2
					this.multiplayers[0].setError({message: error, line})
				}
			}
		} else {
			this.multiplayers[0].setError(undefined)
		}

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

		await node.registerExtensions()
		
		node.setState(initialState || {
			runCount: 0
		});

		node.upload()

		this.sequencer = node

		return node
    }

	renderParametersView() {
		if (this.audioNode.uiReceiver.ui) {
			return <div style="display: flex; flex: 1;">
				<RemoteUIRenderer plugin={this.audioNode} ui={this.audioNode.uiReceiver}></RemoteUIRenderer>
			</div>
		} else {
			return <div style="display: flex; flex: 1;">
			<DynamicParameterView plugin={this.audioNode}></DynamicParameterView>
		  </div>
		}
	}

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		insertStyle(shadow, styles.toString())
		insertStyle(shadow, monacoStyle.toString())
		
		div.setAttribute("width", "1170")
		div.setAttribute("height", "370")
		render(<LiveCoderView plugin={this.audioNode} parametersView={() => this.renderParametersView()} actions={[]}></LiveCoderView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}



