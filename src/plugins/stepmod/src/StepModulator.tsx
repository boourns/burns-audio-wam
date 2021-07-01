import { Clip, ClipState } from './Clip'

export type MIDIEvent = Uint8Array
 export type ScheduledMIDIEvent = {
 	event: MIDIEvent,
 	time: number
 }

export type StepModulatorState = {
	clips: (ClipState | undefined)[]
}

export class StepModulator {
	instanceId: string
	ticks: number;
	dirty: boolean;

	selectedClip: number
	clips: (Clip | undefined)[]

	playing: boolean;

	renderCallback?: () => void
	updateProcessor?: (c: Clip) => void

	constructor(instanceId: string) {
		this.instanceId = instanceId
		this.ticks = -1
		this.dirty = false
		this.playing = false
		this.clips = [new Clip()]
		this.selectedClip = 0

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

	getState(): StepModulatorState {
		var state: StepModulatorState = {
			clips: this.clips.map(v => (!!v) ? v.getState() : undefined)
		}

		return state
	}

	async setState(state: StepModulatorState) {
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