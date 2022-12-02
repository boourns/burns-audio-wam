import { Clip, ClipState } from './Clip'
import { NoteDefinition } from 'wam-extensions'
import { string } from 'lib0'
import { MIDIConfiguration } from './MIDIConfiguration'

export type MIDIEvent = Uint8Array
 export type ScheduledMIDIEvent = {
 	event: MIDIEvent,
 	time: number
 }

export type PianoRollState = {
	clips: Record<string, ClipState>
}

export class PianoRoll {
	instanceId: string
	futureEvents: ScheduledMIDIEvent[];
	dirty: boolean;

	clips: Record<string, Clip>

	playingClip: string | undefined

	midiConfig: MIDIConfiguration

	renderCallback?: () => void
	updateProcessor?: (c: Clip) => void
	updateProcessorMIDIConfig?: (config: MIDIConfiguration) => void

	noteList?: NoteDefinition[]

	constructor(instanceId: string) {
		this.instanceId = instanceId
		this.futureEvents = []
		this.dirty = false
		this.clips = {"default": new Clip("default")}
		this.playingClip = "default"

		this.midiConfig = {
			pluginRecordingArmed: false,
			hostRecordingArmed: false,
			inputMidiChannel: -1,
			outputMidiChannel: 0
		}

		this.registerNoteListHandler()
		Object.keys(this.clips).forEach(id => this.clips[id].updateProcessor = (c) => {
			if (this.updateProcessor) this.updateProcessor(c)
		})
	}

	getClip(id: string) {
		return this.clips[id]
	}

	addClip(id: string) {
		let clip = this.getClip(id)
		if (!clip) {
			let clip = new Clip(id)
			clip.updateProcessor = (c) => {
				if (this.updateProcessor) this.updateProcessor(c)
			}
			this.clips[id] = clip
		}
	}

	registerNoteListHandler() {
		if (window.WAMExtensions && window.WAMExtensions.notes) {
			window.WAMExtensions.notes.addListener(this.instanceId, (notes) => {
				this.noteList = notes
				if (this.renderCallback) {
					this.renderCallback()
				}
			})
		}
	}

	deregisterNoteListHandler() {
		if (window.WAMExtensions && window.WAMExtensions.notes) {
			window.WAMExtensions.notes.addListener(this.instanceId, undefined)
		}
	}

	getState(): PianoRollState {
		var state: PianoRollState = {
			clips: {}
		}

		for (let id of Object.keys(this.clips)) {
			state.clips[id] = this.clips[id].getState()
		}

		return state
	}

	async setState(state: PianoRollState) {
		if (!state) {
			return
		}
		
		const oldClips = this.clips
		this.clips = {}

		for (let id of Object.keys(state.clips)) {
			this.clips[id] = new Clip(id, state.clips[id])
			if (oldClips[id]) {
				this.clips[id].quantize = oldClips[id].quantize
			}
		}

		console.log("PianoRoll setState: loading clips ", state.clips)

		for (let id of Object.keys(this.clips)) {
			this.clips[id].updateProcessor = (c) => {
				if (this.updateProcessor) this.updateProcessor(c)
			}

			if (this.updateProcessor) this.updateProcessor(this.clips[id])
		}

		this.dirty = true
		if (this.renderCallback != undefined) {
			this.renderCallback()
		}
	}

	// clip(): Clip | undefined {
	// 	if (this.selectedClip > this.clips.length || this.selectedClip < 0) {
	// 		return this.clips[0]
	// 	}
	// 	return this.clips[this.selectedClip]
	// }

	clearRenderFlag() {
		this.dirty = false;
	}

	needsRender() {
		return this.dirty;
	}

	armHostRecording(armed: boolean) {
		this.midiConfig.hostRecordingArmed = armed
		if (this.updateProcessorMIDIConfig) {
			this.updateProcessorMIDIConfig(this.midiConfig)
		}
	}

	armPluginRecording(armed: boolean) {
		this.midiConfig.pluginRecordingArmed = armed
		if (this.updateProcessorMIDIConfig) {
			this.updateProcessorMIDIConfig(this.midiConfig)
		}
	}

	inputMidiChanged(v: number) {
		if (v < -1 || v > 15) {
			throw `Invalid input midi value: ${v}`
		}
		this.midiConfig.inputMidiChannel = v
		if (this.updateProcessorMIDIConfig) {
			this.updateProcessorMIDIConfig(this.midiConfig)
		}
	}

	outputMidiChanged(v: number) {
		if (v < 0 || v > 15) {
			throw `Invalid output midi value: ${v}`
		}
		this.midiConfig.outputMidiChannel = v
		if (this.updateProcessorMIDIConfig) {
			this.updateProcessorMIDIConfig(this.midiConfig)
		}
	}
}