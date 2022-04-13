import { WamEventMap, WamTransportData } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import getAudioRecorderProcessor from "./AudioRecorderProcessor";
import { RecordingBuffer } from "./RecordingBuffer";
import { Sample } from './Sample';
import { ClipSettings, SampleEditor, SampleState } from './SampleEditor';

export type ARSampleState = {
	assetUrl: string
	clipId: string
	settings: ClipSettings
}

export type AudioRecorderState = {
	samples: ARSampleState[]
}

function token() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 16)
}

export class AudioRecorderNode extends WamNode {
	destroyed = false;
	recordingArmed: boolean
	monitor: boolean

	recordingBuffer?: RecordingBuffer
	editor: SampleEditor
	transport?: WamTransportData

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

	setMonitor(monitor: boolean) {
		this.port.postMessage({source:"ar", action:"monitor", monitor})
		this.monitor = monitor

		if (this.editor.callback) {
            this.editor.callback()
        }
	}

	async getState(): Promise<AudioRecorderState> {
		let savedAssetUris: ARSampleState[] = this.editor.samples.filter(s => !!s.assetUrl).map(s => { 
			return {
				assetUrl: s.assetUrl, 
				clipId: s.clipId, settings: s.clipSettings ?? {
					clipEnabled: true,
					loopEnabled: false,
					startingOffset: 0,
					loopLengthBars: 1,
					loopStartBar: 0
				}
		}})

		return {
			samples: savedAssetUris
		}
	}

	async setState(state: AudioRecorderState) {
		if (!state) {
			return
		}

		if (state.samples !== undefined) {
			let newSampleList: SampleState[] = []

			let currentSamples = [...this.editor.samples]

			// iterating over the 'new' list of samples
			for (let sample of state.samples) {
				let existingSample = currentSamples.find(s => s.assetUrl == sample.assetUrl && s.clipId == sample.clipId)

				if (!!existingSample) {
					// we already have that sample, remove it from the delete list
					currentSamples = currentSamples.filter(s => !(s.assetUrl == sample.assetUrl && s.clipId == sample.clipId))

					// push this sample into the new internal state
					newSampleList.push(existingSample)
				} else {
					// we do not have this sample yet, add it to our internal list

					let sampleState: SampleState = {
						token: token(),
						clipId: sample.clipId,
						state: "INIT",
						assetUrl: sample.assetUrl,
						zoom: 1,
						name: "",
						height: 0,
						clipSettings: sample.settings
					}
	
					newSampleList.push(sampleState)
				}
			}

			// keep all of our samples we have not saved.
			for (let existing of currentSamples) {
				if (!existing.assetUrl) {
					newSampleList.push(existing)
				}
			}

			// saved samples we used to have that are not in the new state, delete them
			for (let oldSample of currentSamples) {
				this.port.postMessage({source:"ar", action:"delete", clipId: oldSample.clipId, token: oldSample.token})
			}

			this.editor.setState({samples: newSampleList})
		}
	}

	_onMessage(message: MessageEvent<any>): void {
		if (message.data && message.data.source == "ar") {
			if (message.data.action == "transport") {
				this.transport = message.data.transport
			}

			if (message.data.action == "finalize") {
				if (this.recordingBuffer && this.recordingBuffer.channels.length > 0) {

					let sample: SampleState = {
						clipId: message.data.clipId,
						token: token(),
						height: 150,
						state: "LOADED",
						sample: new Sample(this.context, this.recordingBuffer.render(this.context as AudioContext)),
						name: `Sample ${this.editor.samples.length+1}`,
						zoom: 1,
						clipSettings: {
							clipEnabled: true,
							loopEnabled: false,
							loopLengthBars: 1,
							loopStartBar: 0,
							startingOffset: 0,
						}
					}

					this.editor.samples.push(sample)
					this.editor.sendSampleToProcessor(sample)
				}

				this.recordingBuffer = undefined
					
				if (this.editor.callback) {
					this.editor.callback()
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