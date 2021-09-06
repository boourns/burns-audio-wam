import { Clip, ClipState } from './Clip'
import { NoteDefinition } from 'wam-extensions'

export type MIDIEvent = Uint8Array
 export type ScheduledMIDIEvent = {
 	event: MIDIEvent,
 	time: number
 }

export type PianoRollState = {
	clips: (ClipState | undefined)[]
}

export class PianoRoll {
	instanceId: string
	futureEvents: ScheduledMIDIEvent[];
	dirty: boolean;

	selectedClip: number
	clips: (Clip | undefined)[]

	playingClip: string | undefined

	renderCallback?: () => void
	updateProcessor?: (c: Clip) => void

	noteList?: NoteDefinition[]

	constructor(instanceId: string) {
		this.instanceId = instanceId
		this.futureEvents = []
		this.dirty = false
		this.clips = [new Clip()]
		this.selectedClip = 0

		this.registerNoteListHandler()
		this.clips.forEach(c => c.updateProcessor = (c) => {
			if (this.updateProcessor) this.updateProcessor(c)
		})
	}

	getClip(id: string) {
		return this.clips.find(c => c.state.id == id)
	}

	addClip(id: string) {
		let clip = this.getClip(id)
		if (!clip) {
			let clip = new Clip(id)
			clip.updateProcessor = (c) => {
				if (this.updateProcessor) this.updateProcessor(c)
			}
			this.clips.push(clip)
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
			clips: this.clips.map(v => (!!v) ? v.getState() : undefined)
		}

		return state
	}

	async setState(state: PianoRollState) {
		if (!state) {
			return
		}
		
		// TODO this is very shitty performance
		// and prolly some bugs lol
		this.clips = state.clips.map(c => new Clip(c.id, c))

		this.clips.forEach(c => {
			c.updateProcessor = (c) => {
				if (this.updateProcessor) this.updateProcessor(c)
			}

			if (this.updateProcessor) this.updateProcessor(c)
		})

		this.dirty = true
		if (this.renderCallback != undefined) {
			this.renderCallback()
		}
	}

	clip(): Clip | undefined {
		if (this.selectedClip > this.clips.length || this.selectedClip < 0) {
			return this.clips[0]
		}
		return this.clips[this.selectedClip]
	}

	clearRenderFlag() {
		this.dirty = false;
	}

	needsRender() {
		return this.dirty;
	}
}