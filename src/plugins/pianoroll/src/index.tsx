/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule, ParamMgrFactory, CompositeAudioNode } from '../../sdk';
import { h, render } from 'preact';
import { PianoRollView } from './PianoRollView';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { Clip } from './Clip';
import { PianoRoll } from './PianoRoll';
import { PatternDelegate } from '../../extensions';

import {debug} from "debug"
var logger = debug("plugin:pianoroll")

class Node extends CompositeAudioNode {
	destroyed = false;
	pianoRoll: PianoRoll

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

	destroy() {
		super.destroy();
		this.destroyed = true;
		// @ts-ignore
		if (this._output) this._output.parameters.get('destroyed').value = 1;
	}

	async getState(): Promise<any> {
		return this.pianoRoll.getState()
	}

	async setState(state: any) {
		this.pianoRoll.setState(state)
	}
}

export default class PianoRollModule extends WebAudioModule<Node> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_pianoRollProcessorUrl = `${this._baseURL}/PianoRollProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
	}

	pianoRoll: PianoRoll
	pianoRollNode: AudioWorkletNode

	async initialize(state: any) {
		await this._loadDescriptor();
		await this.audioContext.audioWorklet.addModule(this._pianoRollProcessorUrl)

		this.pianoRoll = new PianoRoll(this.instanceId)

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		this.pianoRollNode = new AudioWorkletNode(this.audioContext, 'pianoroll-processor', { processorOptions: { proxyId: this.instanceId }})

		const node = new Node(this.audioContext);
		node.pianoRoll = this.pianoRoll

		// @ts-ignore
		const internalParamsConfig = Object.fromEntries(this.pianoRollNode.parameters);
		delete internalParamsConfig.destroyed;
		const optionsIn = { internalParamsConfig };
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		node.setup(this.pianoRollNode, paramMgrNode);

		// If there is an initial state at construction for this plugin,
		if (initialState) node.setState(initialState);

		node.connect(this.audioContext.destination);

		this.pianoRoll.updateProcessor = (c: Clip) => {
			this.pianoRollNode.port.postMessage({action: "clip", id: c.state.id, state: c.getState()})
		}

		this.updatePatternExtension()

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
			clipId = this.pianoRoll.clip().state.id
		} else {
			this.pianoRoll.addClip(clipId)
		}
		render(<PianoRollView plugin={this} pianoRoll={this.pianoRoll} clipId={clipId}></PianoRollView>, div);

		return div;
	}

	clip(): Clip {
		return this.pianoRoll.clip()
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
				return this.pianoRoll.clips.map(c => {
					return {id: c.state.id, name: "pattern"}
				})
			},
			createPattern: (id: string) => {
				logger("createPattern(%s)", id)
				this.pianoRoll.addClip(id)
			},
			deletePattern: (id: string) => {
				logger("deletePattern(%s)", id)
				this.pianoRoll.clips = this.pianoRoll.clips.filter(c => c.state.id != id)
			},
			playPattern: (id: string | undefined) => {
				logger("playPattern(%s)", id)

				let clip = this.pianoRoll.getClip(id)
				if (!clip && id != undefined) {
					this.pianoRoll.addClip(id)
				}
				this.pianoRoll.playingClip = id

				this.pianoRollNode.port.postMessage({action: "play", id})
			},
			getPatternState: (id: string) => {
				logger("getPatternState(%s)", id)

				let clip = this.pianoRoll.getClip(id)
				if (clip) {
					return clip.getState()
				} else {
					return undefined
				}
			},
			setPatternState: (id: string, state: any) => {
				logger("setPatternState(%s, %o)", id, state)
				let clip = this.pianoRoll.getClip(id)
				if (clip) {
					clip.setState(state)
				} else {
					let clip = new Clip(id, state)
					this.pianoRoll.clips.push(clip)
				}
			}
		}

		window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate)
	}
}
