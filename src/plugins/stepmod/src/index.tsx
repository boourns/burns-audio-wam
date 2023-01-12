import { WamEventMap, WamParameterInfo, WamParameterInfoMap, WamTransportData } from '@webaudiomodules/api';

import { WebAudioModule, WamNode } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { StepModulatorView } from './views/StepModulatorView';
import { StepModulator, StepModulatorState } from './StepModulator';

import { Clip } from './Clip';

import {PatternDelegate} from 'wam-extensions';

import styles from "./views/StepModulatorView.scss"
import { insertStyle} from "../../shared/insertStyle"
import { token } from '../../shared/util';

const MAX_SEQUENCERS = 32

var logger = console.log

export class StepModulatorNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	paramList?: WamParameterInfoMap

	sequencers: Record<string, StepModulator>
	sequencerOrder: string[]
	renderCallback: () => void

	connected: boolean
	activeSteps: Float32Array

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

		const id = token()
		const id2 = token()

		this.sequencers = {}
		this.sequencers[id] = new StepModulator(this.instanceId, id, this.port, () => { return this.paramList })
		this.sequencers[id2] = new StepModulator(this.instanceId, id2, this.port, () => { return this.paramList })
		this.sequencerOrder = [id, id2]


		// @ts-ignore
		const sharedBuffer = new SharedArrayBuffer(32 * 4);
		this.activeSteps = new Float32Array(sharedBuffer);

		this.port.postMessage({source:"stepBuffer", buffer: sharedBuffer})

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	async getState(): Promise<any> {
		var params = await super.getState()
		let sequencerState: Record<string, StepModulatorState> = {}
		for (let id of this.sequencerOrder) {
			sequencerState[id] = this.sequencers[id].getState()
		}

		return {
			params, 
			sequencers: sequencerState,
			sequencerOrder: this.sequencerOrder
		}
	}

	async setState(state: any) {
		if (state.params) {
			await super.setState(state.params)
		}

		if (!state.sequencers) {
			state.sequencers = {}
		}

		if (!state.sequencerOrder) {
			state.sequencerOrder = []
		}

		for (let i = 0; i < state.sequencerOrder.length; i++) {
			const id = state.sequencerOrder[i]

			if (!this.sequencers[id]) {
				this.sequencers[id] = new StepModulator(this.instanceId, id, this.port, () => { return this.paramList})
			}

			this.sequencers[id].setState(state.sequencers[id])
		}

		if (this.sequencerOrder.length != state.sequencerOrder.length || this.sequencerOrder.some((id, i) => id != state.sequencerOrder[i])) {
			this.sequencerOrder = state.sequencerOrder

			this.port.postMessage({source:"order", sequencerOrder: this.sequencerOrder})
		}

		Object.keys(this.sequencers).filter(id => this.sequencerOrder.indexOf(id) == -1).forEach(id => {
			this.sequencers[id].destroy()
			delete this.sequencers[id]
		})
	}
}

export default class StepModulatorModule extends WebAudioModule<StepModulatorNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/StepModulatorProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

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

		if (initialState) {
			node.setState(initialState)
		}

		this.updatePatternExtension()

		if (window.WAMExtensions && window.WAMExtensions.modulationTarget) {
			window.WAMExtensions.modulationTarget.setModulationTargetDelegate(this.instanceId, {
				connectModulation: async (params: WamParameterInfoMap) => {
					node.paramList = params

					for (let id of this.audioNode.sequencerOrder) {
						if (node.sequencers[id].targetId) {
							await node.sequencers[id].setTargetParameter(node.sequencers[id].targetId)
						}
					}

					if (node.renderCallback) {
						node.renderCallback()
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

		for (let id of this.audioNode.sequencerOrder) {
			this.audioNode.sequencers[id].addClip(clipId)
		}

		render(<StepModulatorView plugin={this} clipId={clipId}></StepModulatorView>, shadow);

		return div;
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
				return this.audioNode.sequencers[this.audioNode.sequencerOrder[0]].clips.map(c => {
					return {id: c.state.id, name: "pattern"}
				})
			},
			createPattern: (clipId: string) => {
				logger("createPattern(%s)", clipId)
				for (let id of this.audioNode.sequencerOrder) {
					this.audioNode.sequencers[id].addClip(clipId)
				}
			},
			deletePattern: (clipId: string) => {
				logger("deletePattern(%s)", clipId)
				for (let id of this.audioNode.sequencerOrder) {
					this.audioNode.sequencers[id].deleteClip(clipId)
				}
			},
			playPattern: (clipId: string | undefined) => {
				logger("playPattern(%s)", clipId)

				for (let id of this.audioNode.sequencerOrder) {
					this.audioNode.sequencers[id].addClip(clipId)
				}

				this.audioNode.port.postMessage({action: "play", id: clipId})
			},
			getPatternState: (clipId: string) => {
				logger("getPatternState(%s)", clipId)

				let state: Record<string, any> = {
					clips: {},
					order: this.audioNode.sequencerOrder
				}

				for (let id of this.audioNode.sequencerOrder) {
					let clip = this.audioNode.sequencers[id].getClip(clipId)
					if (clip) {
						state.clips[id] = clip.getState()
					}
				}

				return state
			},
			setPatternState: (clipId: string, state: any) => {
				logger("setPatternState(%s, %o)", clipId, state)

				for (let id of this.audioNode.sequencerOrder) {
					if (!state.clips[id]) {
						continue
					}

					let clip = this.audioNode.sequencers[id].getClip(clipId)
					if (clip) {
						clip.setState(state.clips[id])
					} else {
						this.audioNode.sequencers[id].addClip(clipId)
						this.audioNode.sequencers[id].getClip(clipId).setState(state.clips[id])
					}
				}
			}
		}

		window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate)
	}
}
