import { WamEventMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';

import getAudioRecorderProcessor from "./AudioRecorderProcessor";
import { RecordingBuffer } from "./RecordingBuffer";
import { Sample } from './Sample';
import { SampleEditor, SampleState } from './SampleEditor';

export type AudioRecorderState = {
	samples: string[]
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

		this.editor = new SampleEditor(this.instanceId, this.context)

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
		let savedAssetUris = this.editor.samples.filter(s => !!s.assetUrl).map(s => s.assetUrl)

		return {
			samples: savedAssetUris
		}
	}

	async setState(state: AudioRecorderState) {
		if (!state) {
			return
		}

		if (state.samples !== undefined) {
			let keptSamples: SampleState[] = []

			for (let existingSample of this.editor.samples) {
				if (!existingSample.assetUrl) {
					console.log("keeping unsaved sample")
					// keep unsaved samples
					keptSamples.push(existingSample)
				} else {
					// is this sample in the new list?
					if (state.samples.some(s => s == existingSample.assetUrl)) {
						// keep it in our new sample list
						keptSamples.push(existingSample)

						// it has been found, remove it from the new state list of samples
						state.samples = state.samples.filter(s => s != existingSample.assetUrl)
					} else {
						console.log("not keeping sample ", existingSample)
						console.log("because new sample list is ", state.samples)

						// we're not keeping this sample, it has been removed.

						//TODO: remove this existingSample from the processor as well
					}
				}
			}

			for (let newSample of state.samples) {
				let sampleState: SampleState = {
					state: "INIT",
					assetUrl: newSample,
					zoom: 1,
					name: "",
					height: 0,
				}

				keptSamples.push(sampleState)
			}

			console.log("Setting editor samples to ", keptSamples)

			this.editor.setState({samples: keptSamples})
		}
	}

	_onMessage(message: MessageEvent<any>): void {
		if (message.data && message.data.source == "ar") {
			if (message.data.action == "finalize") {
				if (this.recordingBuffer) {
					this.editor.samples.push({
						height: 150,
						state: "LOADED",
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