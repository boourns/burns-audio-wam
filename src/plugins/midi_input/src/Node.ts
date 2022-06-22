/* eslint-disable no-underscore-dangle */
import { WamEventMap, WamMidiData, WebAudioModule } from '@webaudiomodules/api';
import { addFunctionModule, WamNode } from '@webaudiomodules/sdk';
import getMIDIInputProcessor from './MIDIInputProcessor';

export class MIDIInputNode extends WamNode {
	destroyed = false;

	midiIn: WebMidi.MIDIInput[]
	midiOut: WebMidi.MIDIOutput[]
	selectedDevice: number = -1

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

	selectMIDIInput(index: number) {
		if (this.selectedDevice >= 0) {
			this.midiIn[this.selectedDevice].removeEventListener('midimessage', this.midiMessageReceived)
		}
		this.selectedDevice = index
		if (index >= 0) {
			this.midiIn[index].addEventListener('midimessage', this.midiMessageReceived)
		}
	}

	midiMessageReceived(event: any) {
		const bytes: number[] = []
		for (let b of event.data) {
			bytes.push(b)
		}

		if (event.data.length <= 3) {
			this.port.postMessage({
				source: 'midi',
				bytes
			})
		}
    }
}
