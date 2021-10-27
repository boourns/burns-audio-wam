import { WebAudioModule, WamNode } from 'sdk';
import AudioWorkletRegister from 'sdk/src/ParamMgr/AudioWorkletRegister'
// @ts-ignore
import wamEnvProcessor from 'sdk/src/WamEnv.js'

import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';

import { ExternalInstrumentView } from './ExternalInstrumentView';
import { WamEventMap } from 'sdk/src/api/types';
import { InstrumentDefinition, InstrumentDefinitionLoader, MIDIControlChange } from './InstrumentDefinition';

export {AudioWorkletRegister}
	
class ExternalInstrumentNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	instrument: InstrumentDefinition

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
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);

		this.instrument = new InstrumentDefinition("Standard MIDI", standardMIDICCs)

		super.port.addEventListener("message", (ev) => {
			console.log("Node side: ", ev)
		})

		super.port.postMessage({message:"instrument", data: {notes: this.instrument.notes, cc: this.instrument.midiCCs}})
	}

	async loadInstrumentFile(url: string) {
		let instrument = InstrumentDefinitionLoader.parseFile(await InstrumentDefinitionLoader.loadURL(url))[0]
	}
}

export default class ExternalInstrumentModule extends WebAudioModule<WamNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_processorUrl = `${this._baseURL}/ChorderProcessor.js`;

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
		const node: ExternalInstrumentNode = new ExternalInstrumentNode(this, {});
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

		render(<ExternalInstrumentView plugin={this}></ExternalInstrumentView>, div);
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}
}

let standardMIDICCs: MIDIControlChange[] = [
	{ccNumber:0, name:"Bank Select"},
	{ccNumber:1, name:"Modulation Wheel"},
	{ccNumber:2, name:"Breath Controller"},
	{ccNumber:3, name:"Undefined"},
	{ccNumber:4, name:"Foot Pedal"},
	{ccNumber:5, name:"Portamento"},
	{ccNumber:6, name:"Data Entry (MSB)"},
	{ccNumber:7, name:"MIDI Volume"},
	{ccNumber:8, name:"Stereo Balance"},
	{ccNumber:9, name:"Undefined"},
	{ccNumber:10, name:"Pan Position"},
	{ccNumber:11, name:"Expression Pedal"},
	{ccNumber:12, name:"Effect Controller 1"},
	{ccNumber:13, name:"Effect Controller 2"},
	{ccNumber:14, name:"Undefined"},
	{ccNumber:15, name:"Undefined"},
	{ccNumber:16, name:"Slider"},
	{ccNumber:17, name:"Slider"},
	{ccNumber:18, name:"Slider"},
	{ccNumber:19, name:"Slider"},
	{ccNumber:20, name:"Undefined"},
	{ccNumber:21, name:"Undefined"},
	{ccNumber:22, name:"Undefined"},
	{ccNumber:23, name:"Undefined"},
	{ccNumber:24, name:"Undefined"},
	{ccNumber:25, name:"Undefined"},
	{ccNumber:26, name:"Undefined"},
	{ccNumber:27, name:"Undefined"},
	{ccNumber:28, name:"Undefined"},
	{ccNumber:29, name:"Undefined"},
	{ccNumber:30, name:"Undefined"},
	{ccNumber:31, name:"Undefined"},
	{ccNumber:32, name:"Bank Select (LSB)"},
	{ccNumber:33, name:"Modulation Wheel (LSB)"},
	{ccNumber:34, name:"Breath Controller (LSB)"},
	{ccNumber:35, name:"Undefined"},
	{ccNumber:36, name:"Foot Pedal (LSB)"},
	{ccNumber:37, name:"Portamento"},
	{ccNumber:38, name:"Data Entry (LSB)"},
	{ccNumber:39, name:"Volume (LSB)"},
	{ccNumber:40, name:"Balance (LSB)"},
	{ccNumber:41, name:"Undefined"},
	{ccNumber:42, name:"Pan Position (LSB)"},
	{ccNumber:43, name:"Expression (LSB)"},
	{ccNumber:44, name:"Effect Control 1 (LSB)"},
	{ccNumber:45, name:"Effect Control 2 (LSB)"},
	{ccNumber:46, name:"Undefined"},
	{ccNumber:47, name:"Undefined"},
	{ccNumber:48, name:"Undefined"},
	{ccNumber:49, name:"Undefined"},
	{ccNumber:50, name:"Undefined"},
	{ccNumber:51, name:"Undefined"},
	{ccNumber:52, name:"Undefined"},
	{ccNumber:53, name:"Undefined"},
	{ccNumber:54, name:"Undefined"},
	{ccNumber:55, name:"Undefined"},
	{ccNumber:56, name:"Undefined"},
	{ccNumber:57, name:"Undefined"},
	{ccNumber:58, name:"Undefined"},
	{ccNumber:59, name:"Undefined"},
	{ccNumber:60, name:"Undefined"},
	{ccNumber:61, name:"Undefined"},
	{ccNumber:62, name:"Undefined"},
	{ccNumber:63, name:"Undefined"},
	{ccNumber:64, name:"Sustain Pedal On"},
	{ccNumber:65, name:"Portamento"},
	{ccNumber:66, name:"Sostenuto On"},
	{ccNumber:67, name:"Soft Pedal On"},
	{ccNumber:68, name:"Legato On"},
	{ccNumber:69, name:"Hold Pedal 2"},
	{ccNumber:70, name:"Sound Controller 1"},
	{ccNumber:71, name:"Sound Controller 2"},
	{ccNumber:72, name:"Sound Controller 3"},
	{ccNumber:73, name:"Sound Controller 4"},
	{ccNumber:74, name:"Sound Controller 5"},
	{ccNumber:75, name:"Sound Controller 6"},
	{ccNumber:76, name:"Sound Controller 7"},
	{ccNumber:77, name:"Sound Controller 8"},
	{ccNumber:78, name:"Sound Controller 9"},
	{ccNumber:79, name:"Sound Controller 10"},
	{ccNumber:80, name:"General Purpose"},
	{ccNumber:81, name:"General Purpose"},
	{ccNumber:82, name:"General Purpose"},
	{ccNumber:83, name:"General Purpose"},
	{ccNumber:84, name:"Undefined"},
	{ccNumber:85, name:"Undefined"},
	{ccNumber:86, name:"Undefined"},
	{ccNumber:87, name:"Undefined"},
	{ccNumber:88, name:"Undefined"},
	{ccNumber:89, name:"Undefined"},
	{ccNumber:90, name:"Undefined"},
	{ccNumber:91, name:"Effect 1 Amount (Reverb)"},
	{ccNumber:92, name:"Effect 2 Amount (Tremelo)"},
	{ccNumber:93, name:"Effect 3 Amount (Chorus)"},
	{ccNumber:94, name:"Effect 4 Amount (Detuning)"},
	{ccNumber:95, name:"Effect 5 Amount (Phaser)"},
	{ccNumber:96, name:"Data Bound Increment ("},
	{ccNumber:97, name:"Data Bound Decrement ("},
	{ccNumber:98, name:"NRPN LSB"},
	{ccNumber:99, name:"NRPN MSB"},
	{ccNumber:100, name:"RPN LSB"},
	{ccNumber:101, name:"RPN MSB"},
	{ccNumber:102, name:"Undefined"},
	{ccNumber:103, name:"Undefined"},
	{ccNumber:104, name:"Undefined"},
	{ccNumber:105, name:"Undefined"},
	{ccNumber:106, name:"Undefined"},
	{ccNumber:107, name:"Undefined"},
	{ccNumber:108, name:"Undefined"},
	{ccNumber:109, name:"Undefined"},
	{ccNumber:110, name:"Undefined"},
	{ccNumber:111, name:"Undefined"},
	{ccNumber:112, name:"Undefined"},
	{ccNumber:113, name:"Undefined"},
	{ccNumber:114, name:"Undefined"},
	{ccNumber:115, name:"Undefined"},
	{ccNumber:116, name:"Undefined"},
	{ccNumber:117, name:"Undefined"},
	{ccNumber:118, name:"Undefined"},
	{ccNumber:119, name:"Undefined"},
	{ccNumber:120, name:"Channel Mute"},
	{ccNumber:121, name:"Reset All Controllers"},
	{ccNumber:122, name:"Local Keyboard On"},
	{ccNumber:123, name:"All MIDI Notes OFF"},
	{ccNumber:124, name:"OMNI Mode OFF"},
	{ccNumber:125, name:"OMNI Mode ON"},
	{ccNumber:126, name:"Mono Mode"},
	{ccNumber:127, name:"Poly Mode"},
]