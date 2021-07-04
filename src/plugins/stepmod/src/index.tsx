/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, ParamMgrFactory, CompositeAudioNode, ParamMgrNode, WamParameterInfo } from 'sdk/src';
import { h, render } from 'preact';
import { StepModulatorView } from './StepModulatorView';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { Clip } from './Clip';
import { StepModulator } from './StepModulator';
import { PatternDelegate } from '../../extensions';

import {debug} from "debug"
var logger = debug("plugin:stepModulator")

class Node extends CompositeAudioNode {
	destroyed = false;
	sequencer: StepModulator

	/**
	 * @param {AudioWorkletNode} output
	 * @param {import('../sdk/src/ParamMgr/types').ParamMgrNode} paramMgr
	 */

	// @ts-ignore
	setup(output, paramMgr) {
		this.connect(output, 0, 0);
		this._wamNode = paramMgr;
		this._output = output;
	}

	_wamNode: ParamMgrNode = undefined;

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	destroy() {
		super.destroy();
		this.destroyed = true;
		// @ts-ignore
		if (this._output) this._output.parameters.get('destroyed').value = 1;
	}

	getState(): any {
		var params: any = {}

		this.paramMgr.parameters.forEach((v, k) => {
			params[k] = v.value
		})
		return {params, sequencer: this.sequencer.getState()}
	}

	async setState(state: any) {
		this.paramMgr.parameters.forEach((v, k) => {
			if (state.params[k]) {
				v.setValueAtTime(state.params[k], 0)
			}
		})
		if (state.sequencer) {
			this.sequencer.setState(state.sequencer ? state.sequencer : {})
		}
	}
}

export default class StepModulatorModule extends WebAudioModule<Node> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/StepModulatorProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
	}

	sequencer: StepModulator
	sequencerNode: AudioWorkletNode
	targetParam?: WamParameterInfo

	async initialize(state: any) {
		await this._loadDescriptor();
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		this.sequencer = new StepModulator(this.instanceId)

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		this.sequencerNode = new AudioWorkletNode(this.audioContext, 'step-modulator-processor', { processorOptions: { proxyId: this.instanceId }})

		const node = new Node(this.audioContext);
		node.sequencer = this.sequencer
		
		// @ts-ignore
		const paramsConfig = Object.fromEntries(this.sequencerNode.parameters)
		delete paramsConfig.destroyed;

		const internalParamsConfig = {
			step1: this.sequencerNode.parameters.get("step1"),
			step2: this.sequencerNode.parameters.get("step2"),
			step3: this.sequencerNode.parameters.get("step3"),
			step4: this.sequencerNode.parameters.get("step4"),
			step5: this.sequencerNode.parameters.get("step5"),
			step6: this.sequencerNode.parameters.get("step6"),
			step7: this.sequencerNode.parameters.get("step7"),
			step8: this.sequencerNode.parameters.get("step8"),
			gain: this.sequencerNode.parameters.get("gain"),
			slew: this.sequencerNode.parameters.get("slew")
		}

		const paramsMapping = {
			slew: {
				slew: {
					sourceRange: [0, 1],
					targetRange: [1, 0]
				}
			}
		}
        const optionsIn = { internalParamsConfig, paramsConfig, paramsMapping};

		// @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		node.setup(this.sequencerNode, paramMgrNode);

		// If there is an initial state at construction for this plugin,
		if (initialState) node.setState(initialState);

		this.sequencer.updateProcessor = (c: Clip) => {
			this.sequencerNode.port.postMessage({action: "clip", id: c.state.id, state: c.getState()})
		}

		this.updatePatternExtension()

		if (window.WAMExtensions && window.WAMExtensions.modulationTarget) {
			window.WAMExtensions.modulationTarget.setModulationTargetDelegate(this.instanceId, {
				setModulationTarget: (param: WamParameterInfo) => {
					this.targetParam = param
					this.sequencerNode.port.postMessage({action: "target", param})
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
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		//var shadow = div.attachShadow({mode: 'open'});
		//const container = document.createElement('div');
		//container.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")
		
		//shadow.appendChild(container)

		if (!clipId) {
			clipId = this.sequencer.clip().state.id
		} else {
			this.sequencer.addClip(clipId)
		}

		render(<StepModulatorView plugin={this} sequencer={this.sequencer} clipId={clipId}></StepModulatorView>, div);

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
