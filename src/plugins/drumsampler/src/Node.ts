/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode, WamParameterInfo } from '../../sdk';
import { MIDI, ScheduledMIDIEvent } from '../../shared/midi'
import { NoteDefinition, NoteExtension } from '../../extensions'

import { AudioPool } from './AudioPool'
import { WamParameterInfoMap } from '../../sdk/src/api/types';

export const NUM_VOICES = 12

export class DrumSamplerVoice {
	gain: GainNode
	pan: StereoPannerNode
	lowShelf: BiquadFilterNode
	highShelf: BiquadFilterNode
	context: BaseAudioContext

	constructor(context: BaseAudioContext) {
		this.context = context
		this.lowShelf = context.createBiquadFilter()
		this.highShelf = context.createBiquadFilter()
		this.pan = context.createStereoPanner()
		this.gain = context.createGain()

		this.lowShelf.type = "lowshelf"
		this.highShelf.type = "highshelf"
		
		this.lowShelf.connect(this.highShelf)
		this.highShelf.connect(this.pan)
		this.pan.connect(this.gain)

		this.lowShelf.frequency.setValueAtTime(300, 0)
		this.highShelf.frequency.setValueAtTime(2000, 0)
	}

	paramsConfig(index: number): Record<string, any> {
		var result: Record<string, any> = {}
		result[`gain${index}`] = {
			defaultValue: 1,
			minValue: 0,
			maxValue: 1.5
		}
		result[`pan${index}`] = {
			defaultValue: 0,
			minValue: -1,
			maxValue: 1
		}
		result[`tone${index}`] = {
			defaultValue: 0,
			minValue: -1,
			maxValue: 1
		}

		return result
	}

	internalParamsConfig(index: number): Record<string, any> {
		var result: Record<string, any> = {}
		result[`gain${index}`] = this.gain.gain
		result[`pan${index}`] = this.pan.pan
		result[`lowShelf${index}`] = this.lowShelf.gain
		result[`highShelf${index}`] = this.highShelf.gain
		return result
	}

	paramsMapping(index: number): Record<string, any> {
		var result: Record<string, any> = {}
		result[`tone${index}`] = {}
		result[`tone${index}`][`lowShelf${index}`] = {
			sourceRange: [0, 1],
			targetRange: [0, -60]
		}
		result[`tone${index}`][`highShelf${index}`] = {
			sourceRange: [-1, 0],
			targetRange: [-60, 0]
		}
		return result
	}

	play(buffer: AudioBuffer | undefined) {
		if (!buffer) {
			return
		}
		var source = this.context.createBufferSource();
		source.buffer = buffer
		source.connect(this.lowShelf);
		source.start(this.context.currentTime);
	}
	
	connect(node: AudioNode) {
		this.gain.connect(node)
	}
}

export type DrumSamplerVoiceState = {
	name: string
	url: string
	note: number
}

export type DrumSamplerState = {
	slots: DrumSamplerVoiceState[]
}

export class DrumSamplerNode extends CompositeAudioNode {
	voices: DrumSamplerVoice[]
	buffers: (AudioBuffer|undefined)[]
	noteMap: Map<number, number[]>
	compressor: DynamicsCompressorNode

	state: DrumSamplerState

    audioPool: AudioPool
	loaded: boolean;
	paramMgr: ParamMgrNode

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);

        this.audioPool = new AudioPool(audioContext)
		this.voices = []
		this.buffers = []
		this.noteMap = new Map()

		for (var i = 0; i < NUM_VOICES; i++) {
			this.voices.push(new DrumSamplerVoice(audioContext))
			this.buffers.push(undefined)
		}

        this.loaded = false
		this.state = {slots: []}

		
		this.createNodes();
	}

	async getState(): Promise<any> {
		let state = {
			params: await super.getState(),
			slots: [...this.state.slots.map(v => { return {...v} })]
		}

		return state
	}

	async setState(state: any) {
		if (state.params) {
			await super.setState(state.params)
		}
		if (state.slots) {
			this.updateSlots(state.slots)
		}
	}

	updateSlots(slots: DrumSamplerVoiceState[]) {
		let notes = new Map<number, number[]>()

		var noteMapChanged = false

		for (let i = 0; i < NUM_VOICES; i++) {
			if (slots[i]) {
				// new state has a value for this slot
				if (!this.state.slots[i] || slots[i].url != this.state.slots[i].url) {
					// url previously didn't exist, or changed
					this.audioPool.loadSample(slots[i].url, (buffer: AudioBuffer) => {
						this.buffers[i] = buffer;
					});
				
					noteMapChanged = true
				}
				this.state.slots[i] = {...slots[i]}
			} else {
				if (this.state.slots[i]) {
					noteMapChanged = true
				}

				this.state.slots[i] = undefined
				this.buffers[i] = undefined
			}

			if (slots[i]) {
				var arr = notes.get(slots[i].note)
				if (!arr) {
					arr = []
					notes.set(slots[i].note, arr)
				}
				arr.push(i)
			}
		}

		this.noteMap = notes

		this.updateNoteExtension()
	}

	setup(paramMgr: ParamMgrNode) {
        // @ts-ignore
        paramMgr.addEventListener('midi', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));

        this._wamNode = paramMgr
		this.paramMgr = paramMgr

		this.updateSlots([
			{
				name: "Kick",
				url: "https://burns.ca/static/909/kick.wav",
				note: 36,
			},
			{
				name: "Rimshot",
				url: "https://burns.ca/static/909/rimshot.wav",
				note: 37,
			},
			{
				name: "Snare",
				url: "https://burns.ca/static/909/snare.wav",
				note: 38,
			},
			{
				name: "Clap",
				url: "https://burns.ca/static/909/clap.wav",
				note: 39,
			},
			{
				name: "Low Tom",
				url: "https://burns.ca/static/909/low_tom.wav",
				note: 41,
			},
			{
				name: "Mid Tom",
				url: "https://burns.ca/static/909/mid_tom.wav",
				note: 47,
			},
			{
				name: "High Tom",
				url: "https://burns.ca/static/909/hi_tom.wav",
				note: 43,
			},
			{
				name: "CH",
				url: "https://burns.ca/static/909/ch.wav",
				note: 42,
			},
			{
				name: "OH",
				url: "https://burns.ca/static/909/oh.wav",
				note: 46,
			},
			{
				name: "Crash",
				url: "https://burns.ca/static/909/crash.wav",
				note: 49,
			},
			{
				name: "Ride",
				url: "https://burns.ca/static/909/ride.wav",
				note: 51,
			},
		])

	}

    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
        midiEvents.forEach ((message) => {
			if (message.event[0] == MIDI.NOTE_ON) {
				let midiNote = message.event[1]
				let voices = this.noteMap.get(midiNote)
				for (let i of voices) {
					this.voices[i].play(this.buffers[i])
				}
			}
		});
    }

	isEnabled = true;
	set status(_sig: boolean) {
		this.isEnabled = _sig;
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
		this.compressor = this.context.createDynamicsCompressor()
        this._output = this.context.createGain()
		
		this.compressor.connect(this._output)
		for (let v of this.voices) {
			v.connect(this.compressor)
		}
	}

	updateNoteExtension() {
		if (!(window.WAMExtensions && window.WAMExtensions.notes)) {
			return
		}

		var notes: NoteDefinition[] = []
		this.state.slots.forEach((slot: DrumSamplerVoiceState) => {
			if (!slot) {
				return
			}
			notes.push({
				blackKey: false,
				name: slot.name,
				number: slot.note
			})
		})

		notes = notes.sort((a, b) => a.number - b.number)

		window.WAMExtensions.notes.setNoteList(this.instanceId, notes)
	}
}
