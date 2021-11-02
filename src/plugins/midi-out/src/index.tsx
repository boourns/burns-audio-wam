import { WebAudioModule, WamNode } from '@webaudiomodules/sdk';
import {AudioWorkletRegister} from '@webaudiomodules/sdk-parammgr'
import wamEnvProcessor from '@webaudiomodules/sdk/src/WamEnv.js'

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { MIDIOutputView } from './MIDIOutputView';
import { WamEventMap } from '@webaudiomodules/api';

const register = AudioWorkletRegister

type MIDIOutputNodeState = {
	channel: number
	deviceID: string | undefined
}

class MIDIOutputNode extends WamNode {
	processorReady = false;
	outputReady = false;
	midiAccess?: WebMidi.MIDIAccess
	updateUI?: () => void

	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	state: MIDIOutputNodeState
	fetchedOutputID?: string
	output?: WebMidi.MIDIOutput

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

		this.state = {
			deviceID: undefined,
			channel: 0
		}

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);

		super.port.addEventListener("message", (ev) => {
			if (ev.data.me) {
				if (ev.data.message == "hello") {
					this.processorReady = true
				}

				if (ev.data.message == "midi" && this.midiAccess) {
					if (this.fetchedOutputID != this.state.deviceID) {
						this.output = this.midiAccess.outputs.get(this.state.deviceID)
						this.fetchedOutputID = this.state.deviceID
					}
					
					this.output.send(ev.data.data.bytes)
				}
			}
		})

		this.requestMIDI()
	}

	async requestMIDI() {
		try {
			// @ts-ignore
			let midi = await navigator.requestMIDIAccess({sysex: false, software: true})

			this.midiReady(midi)
		}
		catch (e) {
			console.error("Failure requesting MIDI access: ", e)
		}
	}

	midiReady(midi: WebMidi.MIDIAccess) {
		this.midiAccess = midi
		if (this.state.deviceID == undefined) {
			this.state.deviceID = Array.from(midi.outputs.keys())[0]
		}

		if (this.updateUI) {
			this.updateUI()
		}
	}

	async getState(): Promise<MIDIOutputNodeState> {
		return {...this.state}
	}

	async setState(state: MIDIOutputNodeState) {
		this.state = {...state}
	}
}

export default class MIDIOutputModule extends WebAudioModule<MIDIOutputNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/MIDIOutputProcessor.js`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);

		return descriptor
	}

	async initialize(state: any) {
		await this._loadDescriptor();
		// @ts-ignore
		const AudioWorkletRegister = window.AudioWorkletRegister;
		await AudioWorkletRegister.register('__WebAudioModules_WamEnv', wamEnvProcessor, this.audioContext.audioWorklet);
		await this.audioContext.audioWorklet.addModule(this._processorUrl)

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const node: MIDIOutputNode = new MIDIOutputNode(this, {});
		await node._initialize()

		if (initialState) node.setState(initialState);

		return node
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		//var shadow = div.attachShadow({mode: 'open'});
		//const container = document.createElement('div');
		//container.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")
		
		//shadow.appendChild(container)

		render(<MIDIOutputView plugin={this}></MIDIOutputView>, div);
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}