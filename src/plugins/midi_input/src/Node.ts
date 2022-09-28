/* eslint-disable no-underscore-dangle */
import "wam-extensions"

import { WamEventMap, WamMidiData, WebAudioModule } from '@webaudiomodules/api';
import { addFunctionModule, WamNode } from '@webaudiomodules/sdk';
import getMIDIInputProcessor from './MIDIInputProcessor';

export class MIDIInputNode extends WamNode {
	destroyed = false;

	callback?: () => void
	midiInitialized: boolean = false

	midiIn: WebMidi.MIDIInput[]
	midiOut: WebMidi.MIDIOutput[]
	selectedMidi?: WebMidi.MIDIInput

	_supportedEventTypes: Set<keyof WamEventMap>

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getMIDIInputProcessor, moduleId);
	}

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

		this.midiMessageReceived = this.midiMessageReceived.bind(this)
	}

	async initializeMidi() {
		try {
			let midi = await navigator.requestMIDIAccess({sysex: true});
			midi.addEventListener('statechange', (event: WebMidi.MIDIConnectionEvent) => this.midiReady(event.target as WebMidi.MIDIAccess));

			this.midiReady(midi)
		} catch (err) {
			console.log('Error accessing MIDI devices: ', err);
		}	  
	}

	midiReady(midi: WebMidi.MIDIAccess) {
		// Reset.
		this.midiIn = [];
		this.midiOut = [];
		
		// MIDI devices that send you data.
		const inputs = midi.inputs.values();
		for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
			this.midiIn.push(input.value);
		}
		
		// MIDI devices that you send data to.
		const outputs = midi.outputs.values();
		for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
			this.midiOut.push(output.value);
		}

		this.midiInitialized = true

		const selected = window.WAMExtensions.userSetting.get(this.instanceId, "selectedMidiPort")
		if (selected != undefined) {
			this.selectMIDIInput(selected)
		}

		if (this.callback) {
			this.callback()
		}
	}

	selectMIDIInput(id: string) {
		if (this.selectedMidi) {
			this.selectedMidi.removeEventListener('midimessage', this.midiMessageReceived)
		}

		this.selectedMidi = this.midiIn.find(midi => midi.id == id)

		if (this.selectedMidi || id == "none") {
			window.WAMExtensions.userSetting.set(this.instanceId, "selectedMidiPort", this.selectedMidi ? this.selectedMidi.id : undefined)
		}
		
		if (this.selectedMidi) {
			this.selectedMidi.addEventListener('midimessage', this.midiMessageReceived)
		}
	}

	midiMessageReceived(event: any) {
		if (event.data.length <= 3) {
			const bytes: number[] = []
			for (let b of event.data) {
				bytes.push(b)
			}

			this.port.postMessage({
				source: 'midi',
				bytes
			})
		} else if (event.data[0] == 0xf0) {
			this.port.postMessage({
				source: 'sysex',
				bytes: event.data
			})
		}
    }
}
