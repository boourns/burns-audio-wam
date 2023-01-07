import { WamEventMap, WamParameterInfo, WamParameterInfoMap, WamTransportData } from '@webaudiomodules/api';

import { WebAudioModule, WamNode } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { StepModulatorView } from './StepModulatorView';
import { StepModulator } from './StepModulator';

import { Clip } from './Clip';

import {PatternDelegate} from 'wam-extensions';

import styles from "./StepModulatorView.scss"
import { insertStyle} from "../../shared/insertStyle"

var logger = console.log

class StepModulatorNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	paramList?: WamParameterInfoMap

	sequencer: StepModulator

	connected: boolean

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
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	async getState(): Promise<any> {
		var params = await super.getState()
		return {
			params, 
			sequencer: this.sequencer.getState(),
		}
	}

	async setState(state: any) {
		if (state.params) {
			await super.setState(state.params)
		}

		if (state.sequencer) {
			this.sequencer.setState(state.sequencer ? state.sequencer : {})
		}
	}

	
}

export default class StepModulatorModule extends WebAudioModule<StepModulatorNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/StepModulatorProcessor.js`;

	nonce: string | undefined;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	sequencer: StepModulator
	sequencerNode: StepModulatorNode
	targetParam?: WamParameterInfo

	async initialize(state: any) {
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await StepModulatorNode.addModules(this.audioContext, this.moduleId)
		
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		const node: StepModulatorNode = new StepModulatorNode(this, {});
		await node._initialize();

		this.sequencer = new StepModulator(this.instanceId, node.port, () => { return node.paramList })

		node.sequencer = this.sequencer
		this.sequencerNode = node

		if (initialState) node.setState(initialState);

		this.sequencer.updateProcessor = (c: Clip) => {
			this.sequencerNode.port.postMessage({action: "clip", id: c.state.id, state: c.getState()})
		}

		this.updatePatternExtension()

		if (window.WAMExtensions && window.WAMExtensions.modulationTarget) {
			window.WAMExtensions.modulationTarget.setModulationTargetDelegate(this.instanceId, {
				connectModulation: async (params: WamParameterInfoMap) => {
					node.paramList = params

					if (node.sequencer.targetParam) {
						await node.sequencer.setTargetParameter(node.sequencer.targetParam)
					}

					if (this.sequencer.renderCallback) {
						this.sequencer.renderCallback()
					}
				}
			})
		} else {
			console.log("did not find modulationTarget extension ", window.WAMExtensions)
		}
		
		return node
    }

	async createGui(clipId?: string) {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});

		insertStyle(shadow, styles.toString())

		if (!clipId) {
			clipId = this.sequencer.clip().state.id
		} else {
			this.sequencer.addClip(clipId)
		}

		render(<StepModulatorView plugin={this} sequencer={this.sequencer} clipId={clipId}></StepModulatorView>, shadow);

		return div;
	}

	clip(): Clip {
		return this.sequencer.clip()
	}

	destroyGui(el: Element) {
		render(null, el)
	}

	updatePatternExtension() {
		if (!(window.WAMExtensions && window.WAMExtensions.patterns)) {
			return
		}

		let patternDelegate: PatternDelegate = {
			getPatternList: () => {
				return this.sequencer.clips.map(c => {
					return {id: c.state.id, name: "pattern"}
				})
			},
			createPattern: (id: string) => {
				logger("createPattern(%s)", id)
				this.sequencer.addClip(id)
			},
			deletePattern: (id: string) => {
				logger("deletePattern(%s)", id)
				this.sequencer.clips = this.sequencer.clips.filter(c => c.state.id != id)
			},
			playPattern: (id: string | undefined) => {
				logger("playPattern(%s)", id)

				let clip = this.sequencer.getClip(id)
				if (!clip && id != undefined) {
					this.sequencer.addClip(id)
				}

				this.sequencerNode.port.postMessage({action: "play", id})
			},
			getPatternState: (id: string) => {
				logger("getPatternState(%s)", id)

				let clip = this.sequencer.getClip(id)
				if (clip) {
					return clip.getState()
				} else {
					return undefined
				}
			},
			setPatternState: (id: string, state: any) => {
				logger("setPatternState(%s, %o)", id, state)
				let clip = this.sequencer.getClip(id)
				if (clip) {
					clip.setState(state)
				} else {
					let clip = new Clip(id, state)
					this.sequencer.clips.push(clip)
				}
			}
		}

		window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate)
	}
}
