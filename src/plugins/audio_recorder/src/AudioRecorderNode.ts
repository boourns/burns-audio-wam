import { WamEventMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';

import getAudioRecorderProcessor from "./AudioRecorderProcessor";
import { RecordingBuffer } from "./RecordingBuffer";
import { Sample } from './Sample';
import { SampleEditor } from './SampleEditor';

export class AudioRecorderNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>
	recording: boolean

	recordingBuffer?: RecordingBuffer
	editor: SampleEditor

	callback?: () => void

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getAudioRecorderProcessor, moduleId);
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

		this.editor = new SampleEditor()

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}

	setRecording(recording: boolean) {
		this.port.postMessage({source:"ar", recording})
		this.recording = recording

		if (!recording && this.recordingBuffer) {
			this.editor.samples.push({
				height:100,
				sample: new Sample(this.context, this.recordingBuffer.render(this.context)),
				name: `Sample ${this.editor.samples.length+1}`,
				zoom: 1,
			})

			this.recordingBuffer = undefined
		}

        if (this.callback) {
            this.callback()
        }
	}

	_onMessage(message: MessageEvent<any>): void {
		if (message.data && message.data.source == "ar") {
			if (message.data.buffer) {
				let {startSample, endSample, channels} = message.data.buffer;

				if (!this.recordingBuffer) {
					this.recordingBuffer = new RecordingBuffer(channels.length)
				}
				this.recordingBuffer.append(startSample, endSample, channels)
			}
		} else {
			super._onMessage(message)
		}
	}
}