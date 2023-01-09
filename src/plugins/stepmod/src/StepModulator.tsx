import { WamParameterInfo, WamParameterInfoMap } from '@webaudiomodules/api'
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
	index: number

	ticks: number;
	dirty: boolean;

	selectedClip: number
	clips: (Clip | undefined)[]

	playing: boolean;
	targetId?: string
	targetParameter?: WamParameterInfo
	
	port: MessagePort
	paramList: () => (WamParameterInfoMap | undefined)

	renderCallback?: () => void

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
			this.updateProcessor(c)
		})
	}

	getClip(id: string) {
		return this.clips.find(c => c.state.id == id)
	}

	destroy() {
		
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
			clips: this.clips.map(v => (!!v) ? v.getState() : undefined),
			targetParam: this.targetId
		}

		return state
	}

	async setState(index: number, state: StepModulatorState) {
		if (this.index != index) {
			
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

		if (state.targetParam != this.targetId) {
			await this.setTargetParameter(state.targetParam)
		}

		this.dirty = true
		if (this.renderCallback != undefined) {
			this.renderCallback()
		}
	}

	async setTargetParameter(id: string | undefined) {
		this.targetId = id
		const paramList = this.paramList()
		if (!paramList) {
			return
		}

		// paramList is set 
		const param = id ? paramList[id] : undefined
		this.targetParameter = param

		this.port.postMessage({source:"sequencer", action: "target", param})

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

	updateProcessor(c: Clip) {
		this.port.postMessage({source:"sequencer", index: this.index, action: "clip", id: c.state.id, state: c.getState()})
	}
}