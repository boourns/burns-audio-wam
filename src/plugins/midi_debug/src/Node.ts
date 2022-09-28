/* eslint-disable no-underscore-dangle */
import { WamEventMap, WamMidiData, WebAudioModule } from '@webaudiomodules/api';
import { addFunctionModule, WamNode } from '@webaudiomodules/sdk';
import getMIDIDebugProcessor from './MIDIDebugProcessor';
import { MIDIRecording } from './MIDIRecording';


export class MIDIDebugNode extends WamNode {
	destroyed = false;

	_supportedEventTypes: Set<keyof WamEventMap>
	callback?: () => void

	recording: MIDIRecording

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
		super(module, {
			...options, processorOptions: {
				numberOfInputs: 1,
				numberOfOutputs: 1,
				outputChannelCount: [2],
			}
		});

		this.recording = new MIDIRecording()

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-sysex']);
	}

	async getState(): Promise<any> {
		return {
			recordings: [this.recording.getState()]
		}
	}

	async setState(state: any): Promise<void> {
		if (!state.recordings || state.recordings.length < 1) {
			return
		}
		this.recording.setState(state.recordings[0])
		if (this.callback) {
			this.callback()
		}
	}

	_onMessage(message: MessageEvent<any>): void {
		if (message.data && message.data.source == "midi") {
			this.recording.messages.push({incoming: true, timestamp: message.data.timestamp, bytes: message.data.bytes })
			if (this.callback) {
				this.callback()
			}
		} else if (message.data && message.data.source == "sysex") {
			let data: number[] = []
			for (let b of message.data.bytes) {
				data.push(b)
			}
			this.recording.messages.push({incoming: true, timestamp: message.data.timestamp, bytes: data })
			if (this.callback) {
				this.callback()
			}
		}
		else {
			super._onMessage(message)
		}
	}

	emitMIDI(bytes: number[]) {
		
		this.port.postMessage({
			source: 'midi',
			bytes
		})

		this.recording.messages.push({incoming: false, timestamp: this.context.currentTime, bytes })
	}
}
