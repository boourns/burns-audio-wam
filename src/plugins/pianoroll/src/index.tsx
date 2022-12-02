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

import styleRoot from "./PianoRollView.scss";
import { MIDIConfiguration } from './MIDIConfiguration';

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
	nonce: string | undefined;

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

		this.sequencer.pianoRoll.updateProcessorMIDIConfig = (config: MIDIConfiguration) => {
			this.sequencer.port.postMessage({action: "midiConfig", config})
		}

		this.sequencer.port.addEventListener("message", ev => {
			if (ev.data.event == "transport") {
				this.transport = ev.data.transport
			} else if (ev.data.event == "addNote") {
				const clip = this.sequencer.pianoRoll.getClip(this.sequencer.pianoRoll.playingClip)
				const note = ev.data.note

				// TODO: optionally don't quantize and just use note.tick
				const quantizedTick = Math.round(note.tick / clip.quantize) * clip.quantize

				clip?.addNote(quantizedTick, note.number, note.duration, note.velocity)
				if (this.sequencer.pianoRoll.renderCallback) {
					this.sequencer.pianoRoll.renderCallback()
				}
			}
		})

		this.updateExtensions()

		return node
    }

	async createGui(clipId?: string) {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		div.setAttribute("width", "1024")
		div.setAttribute("height", "680")
		
		var shadow = div.attachShadow({mode: 'open'});
		const container = document.createElement('div');
		container.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")
		
		shadow.appendChild(container)

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

		if (!clipId) {
			clipId = "default"
		} else {
			this.sequencer.pianoRoll.addClip(clipId)
		}
		render(<PianoRollView plugin={this} pianoRoll={this.sequencer.pianoRoll} clipId={clipId}></PianoRollView>, shadow);

		return div;
	}

	// clip(): Clip {
	// 	return this.sequencer.pianoRoll.clip()
	// }

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}

		render(null, el)
	}

	updateExtensions() {
		if (window.WAMExtensions && window.WAMExtensions.recording) {
			window.WAMExtensions.recording.register(this.instanceId, {
				armRecording: (armed: boolean) => {
					this.sequencer.pianoRoll.armHostRecording(armed)
				}
			})
		} else {
			this.sequencer.pianoRoll.armHostRecording(true)
		}

		if (!(window.WAMExtensions && window.WAMExtensions.patterns)) {
			return
		}

		let patternDelegate: PatternDelegate = {
			getPatternList: () => {
				return Object.keys(this.sequencer.pianoRoll.clips).map(id => {
					return {id: id, name: "pattern"}
				})
			},
			createPattern: (id: string) => {
				logger("createPattern(%s)", id)
				this.sequencer.pianoRoll.addClip(id)
			},
			deletePattern: (id: string) => {
				logger("deletePattern(%s)", id)
				delete this.sequencer.pianoRoll.clips[id]
			},
			playPattern: (id: string | undefined) => {
				logger("playPattern(%s)", id)

				let clip = this.sequencer.pianoRoll.getClip(id)
				if (!clip && id != undefined) {
					console.log("PianoRoll index: adding clip ", id)
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
					this.sequencer.pianoRoll.clips[id] = clip
				}
				if (this.sequencer.pianoRoll.renderCallback) {
					this.sequencer.pianoRoll.renderCallback()
				}
			}
		}

		window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate)


	}
}
