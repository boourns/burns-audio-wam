/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WamEventMap, WamTransportData } from '@webaudiomodules/api';
import { WebAudioModule, WamNode } from '@webaudiomodules/sdk';
import { h, render } from 'preact';

import { PatternDelegate } from 'wam-extensions';

import { PianoRollView } from './PianoRollView';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { Clip } from './Clip';
import { PianoRoll } from './PianoRoll';

const logger = console.log

class PianoRollNode extends WamNode {
	destroyed = false;
	pianoRoll: PianoRoll
	_supportedEventTypes: Set<keyof WamEventMap>

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

		this.pianoRoll = new PianoRoll(module.instanceId)

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	async getState(): Promise<any> {
		return this.pianoRoll.getState()
	}

	async setState(state: any) {
		this.pianoRoll.setState(state)
	}
}

export default class PianoRollModule extends WebAudioModule<PianoRollNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_pianoRollProcessorUrl = `${this._baseURL}/PianoRollProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	sequencer: PianoRollNode
	transport?: WamTransportData

	async initialize(state: any) {
		await this._loadDescriptor();
		
		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await PianoRollNode.addModules(this.audioContext, this.moduleId)
		await this.audioContext.audioWorklet.addModule(this._pianoRollProcessorUrl)

		const node: PianoRollNode = new PianoRollNode(this, {});

		await node._initialize()

		node.setState(initialState);

		this.sequencer = node

		this.sequencer.pianoRoll.updateProcessor = (c: Clip) => {
			this.sequencer.port.postMessage({action: "clip", id: c.state.id, state: c.getState()})
		}

		this.sequencer.port.addEventListener("message", ev => {
			if (ev.data.event == "transport") {
				this.transport = ev.data.transport
			}
		})

		this.updatePatternExtension()

		return node
    }

	async createGui(clipId?: string) {		
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		var shadow = div.attachShadow({mode: 'open'});
		const container = document.createElement('div');
		container.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")
		
		shadow.appendChild(container)
		if (!clipId) {
			clipId = this.sequencer.pianoRoll.clip().state.id
		} else {
			this.sequencer.pianoRoll.addClip(clipId)
		}
		render(<PianoRollView plugin={this} pianoRoll={this.sequencer.pianoRoll} clipId={clipId}></PianoRollView>, shadow);

		return div;
	}

	clip(): Clip {
		return this.sequencer.pianoRoll.clip()
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
				return this.sequencer.pianoRoll.clips.map(c => {
					return {id: c.state.id, name: "pattern"}
				})
			},
			createPattern: (id: string) => {
				logger("createPattern(%s)", id)
				this.sequencer.pianoRoll.addClip(id)
			},
			deletePattern: (id: string) => {
				logger("deletePattern(%s)", id)
				this.sequencer.pianoRoll.clips = this.sequencer.pianoRoll.clips.filter(c => c.state.id != id)
			},
			playPattern: (id: string | undefined) => {
				logger("playPattern(%s)", id)

				let clip = this.sequencer.pianoRoll.getClip(id)
				if (!clip && id != undefined) {
					this.sequencer.pianoRoll.addClip(id)
				}
				this.sequencer.pianoRoll.playingClip = id

				this.sequencer.port.postMessage({action: "play", id})
			},
			getPatternState: (id: string) => {
				logger("getPatternState(%s)", id)

				let clip = this.sequencer.pianoRoll.getClip(id)
				if (clip) {
					return clip.getState(true)
				} else {
					return undefined
				}
			},
			setPatternState: (id: string, state: any) => {
				logger("setPatternState(%s, %o)", id, state)
				let clip = this.sequencer.pianoRoll.getClip(id)
				if (clip) {
					clip.setState(state, id)
				} else {
					let clip = new Clip(id, state)
					this.sequencer.pianoRoll.clips.push(clip)
				}
				if (this.sequencer.pianoRoll.renderCallback) {
					this.sequencer.pianoRoll.renderCallback()
				}
			}
		}

		window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate)
	}
}
