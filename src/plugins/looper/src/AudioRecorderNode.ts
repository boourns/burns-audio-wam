import { WamEventMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';

import getAudioRecorderProcessor from "./AudioRecorderProcessor";
import { RecordingBuffer } from "./RecordingBuffer";
import { Sample } from './Sample';
import { SampleEditor } from './SampleEditor';

export type AudioRecorderState = {
	recordingArmed: boolean
}

export class AudioRecorderNode extends WamNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>
	recordingArmed: boolean

	recordingBuffer?: RecordingBuffer
	editor: SampleEditor

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
		this.recordingArmed = false

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-transport']);
	}

	setRecording(recording: boolean) {
		this.port.postMessage({source:"ar", recording})
		this.recordingArmed = recording

        if (this.editor.callback) {
            this.editor.callback()
        }
	}

	async getState(): Promise<AudioRecorderState> {
		return {
			recordingArmed: this.recordingArmed
		}
	}

	async setState(state: AudioRecorderState) {
		if (state) {
			this.setRecording(!!state.recordingArmed)
		}
	}

	_onMessage(message: MessageEvent<any>): void {
		if (message.data && message.data.source == "ar") {
			if (message.data.action == "finalize") {
				if (this.recordingBuffer) {
					this.editor.samples.push({
						height: 150,
						sample: new Sample(this.context, this.recordingBuffer.render(this.context)),
						name: `Sample ${this.editor.samples.length+1}`,
						zoom: 1,
					})
		
					this.recordingBuffer = undefined
					
					if (this.editor.callback) {
						
						this.editor.callback()
					}
				}
			}

			if (message.data.buffer) {
				let {startSample, endSample, channels} = message.data.buffer;

				if (!this.recordingBuffer) {
					this.recordingBuffer = new RecordingBuffer(channels.length)
					if (this.editor.callback) {
						this.editor.callback()
					}
				}
				this.recordingBuffer.append(startSample, endSample, channels)
			}


		} else {
			super._onMessage(message)
		}
	}
}