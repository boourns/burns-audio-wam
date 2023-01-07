import { WamParameterInfoMap } from '@webaudiomodules/api'
import { Clip, ClipState } from './Clip'

export type MIDIEvent = Uint8Array
 export type ScheduledMIDIEvent = {
 	event: MIDIEvent,
 	time: number
 }

export type StepModulatorState = {
	clips: (ClipState | undefined)[]
	targetParam?: string
}

export class StepModulator {
	instanceId: string
	ticks: number;
	dirty: boolean;

	selectedClip: number
	clips: (Clip | undefined)[]

	playing: boolean;
	targetParam?: string
	
	port: MessagePort
	paramList: () => (WamParameterInfoMap | undefined)

	renderCallback?: () => void
	updateProcessor?: (c: Clip) => void

	constructor(instanceId: string, port: MessagePort, paramList: () => (WamParameterInfoMap | undefined)) {
		this.instanceId = instanceId
		this.ticks = -1
		this.dirty = false
		this.playing = false
		this.clips = [new Clip()]
		this.selectedClip = 0
		this.paramList = paramList
		this.port = port

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

		if (state.targetParam != this.targetParam) {
			this.setTargetParameter(state.targetParam)
		}

		this.dirty = true
		if (this.renderCallback != undefined) {
			this.renderCallback()
		}
	}

	async setTargetParameter(id: string | undefined) {
		this.targetParam = id

		const paramList = this.paramList()
		if (!paramList) {
			return
		}

		// paramList is set 
		const param = id ? paramList[id] : undefined

		this.port.postMessage({action: "target", param})

		let ids = id ? [id] : []

		await window.WAMExtensions.modulationTarget.lockParametersForAutomation(this.instanceId, ids)
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