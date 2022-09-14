import { Clip, ClipState } from './Clip'
import { NoteDefinition } from 'wam-extensions'
import { string } from 'lib0'

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

	renderCallback?: () => void
	updateProcessor?: (c: Clip) => void

	noteList?: NoteDefinition[]

	constructor(instanceId: string) {
		this.instanceId = instanceId
		this.futureEvents = []
		this.dirty = false
		this.clips = {"default": new Clip()}

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
				console.log("Notelist handler called! ", notes)
				this.noteList = notes
				if (this.renderCallback) {
					this.renderCallback()
				}
			})
			console.log("Registered note extension for id ", this.instanceId)
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
		
		this.clips = {}

		for (let id of Object.keys(state.clips)) {
			this.clips[id] = new Clip(id, state.clips[id])
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
}