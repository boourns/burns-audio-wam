/* eslint-disable no-underscore-dangle */
import { WamEventMap, WamMidiData, WebAudioModule } from '@webaudiomodules/api';
import { addFunctionModule, WamNode } from '@webaudiomodules/sdk';
import getMIDIDebugProcessor from './MIDIDebugProcessor';

export class MIDIDebugNode extends WamNode {
	destroyed = false;

	_supportedEventTypes: Set<keyof WamEventMap>

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getMIDIDebugProcessor, moduleId);
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

	midiMessageReceived(event: any) {
		const bytes: [number, number, number] = [event.data[0], event.data[1], event.data[2]]

		console.log("Emitting midi: ", bytes)

		if (event.data.length <= 3) {
			this.port.postMessage({
				source: 'midi',
				bytes
			})
		}
    }
}
