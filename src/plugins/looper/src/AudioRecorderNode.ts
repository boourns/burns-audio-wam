import { WamEventMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import { string } from 'lib0';

import getAudioRecorderProcessor from "./AudioRecorderProcessor";
import { RecordingBuffer } from "./RecordingBuffer";
import { Sample } from './Sample';
import { SampleEditor, SampleState } from './SampleEditor';

export type ARSampleState = {
	assetUrl: string
	clipId: string
}

export type AudioRecorderState = {
	samples: ARSampleState[]
}

function token() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 16)
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

		this.editor = new SampleEditor(this.instanceId, this.context, this.port)

		this.recordingArmed = false

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-transport']);
	}

	setRecording(recording: boolean) {
		this.port.postMessage({source:"ar", action: "record", recording})
		this.recordingArmed = recording

        if (this.editor.callback) {
            this.editor.callback()
        }
	}

	async getState(): Promise<AudioRecorderState> {
		let savedAssetUris: ARSampleState[] = this.editor.samples.filter(s => !!s.assetUrl).map(s => { return {assetUrl: s.assetUrl, clipId: s.clipId}})

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
					if (state.samples.some(s => s.assetUrl == existingSample.assetUrl && s.clipId == existingSample.clipId)) {
						// keep it in our new sample list
						keptSamples.push(existingSample)

						// it has been found, remove it from the new state list of samples
						state.samples = state.samples.filter(s => !(s.assetUrl == existingSample.assetUrl && s.clipId == existingSample.clipId))
					} else {
						console.log("not keeping sample ", existingSample)
						console.log("because new sample list is ", state.samples)

						// we're not keeping this sample, it has been removed.

						//TODO: remove this existingSample from the processor as well
						this.port.postMessage({source:"ar", action:"delete", clipId: existingSample.clipId, token: existingSample.token})
					}
				}
			}

			for (let newSample of state.samples) {
				let sampleState: SampleState = {
					token: token(),
					clipId: newSample.clipId,
					state: "INIT",
					assetUrl: newSample.assetUrl,
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
					let sample: SampleState = {
						clipId: message.data.clipId,
						token: token(),
						height: 150,
						state: "LOADED",
						sample: new Sample(this.context, this.recordingBuffer.render(this.context)),
						name: `Sample ${this.editor.samples.length+1}`,
						zoom: 1,
					}

					this.editor.samples.push(sample)
					this.editor.sendSampleToProcessor(sample)

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