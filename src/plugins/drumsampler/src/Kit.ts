import { NoteDefinition, WamAsset } from "wam-extensions";
import { MIDI, ScheduledMIDIEvent } from "../../shared/midi";
import { AudioPool } from "./AudioPool";
import { DrumSamplerVoice, DrumSamplerVoiceState } from "./Voice";

export type DrumSamplerKitState = {
	slots: DrumSamplerVoiceState[]
}

export class DrumSamplerKit {
    numVoices: number
    audioPool: AudioPool
	instanceId: string
	audioContext: BaseAudioContext

    loaded: boolean
    state: DrumSamplerKitState
    voices: DrumSamplerVoice[]
	buffers: (AudioBuffer|undefined)[]
	noteMap: Map<number, number[]>

	callback?: () => void

    constructor(instanceId: string, numVoices: number, audioContext: BaseAudioContext) {
		this.instanceId = instanceId
		this.audioContext = audioContext

        this.numVoices = numVoices
        this.voices = []
		this.buffers = []
		this.noteMap = new Map()

        this.audioPool = new AudioPool(audioContext)
		
        this.loaded = false
		this.state = {slots: []}

		for (var i = 0; i < numVoices; i++) {
			this.voices.push(new DrumSamplerVoice(audioContext))
			this.buffers.push(undefined)
		}
    }

	getState(): DrumSamplerKitState {
		return {
			slots: this.state.slots.map(s => { return {...s}})
		}
	}

	async setState(state: DrumSamplerKitState): Promise<boolean> {
		if (state.slots) {
			return await this.updateSlots(state.slots)
		}
		return false
	}

	async updateSlot(index: number, slot: DrumSamplerVoiceState) {
		let slots = [...this.state.slots]
		slots[index] = slot
		
		await this.updateSlots(slots)
	}

	async updateSlots(slots: DrumSamplerVoiceState[]): Promise<boolean> {
		let notes = new Map<number, number[]>()

		var noteMapChanged = false

		for (let i = 0; i < this.numVoices; i++) {
		
			if (slots[i]) {
				// new state has a value for this slot
				if (!this.state.slots[i] || slots[i].uri != this.state.slots[i].uri) {
					// url previously didn't exist, or changed

					if (window.WAMExtensions.assets) {
						// depend on host to load uri: might not be public URL
						window.WAMExtensions.assets.loadAsset(this.instanceId, slots[i].uri).then(async (asset: WamAsset) => {
							if (asset.content) {
								let buffer = await asset.content.arrayBuffer()

								this.audioContext.decodeAudioData(buffer, (buffer: AudioBuffer) => {
									this.buffers[i] = buffer
									if (this.callback) {
										this.callback()
									}
								})
								
							}
						})

					} else {
						this.audioPool.loadSample(slots[i].uri, (buffer: AudioBuffer) => {
							this.buffers[i] = buffer;

							if (this.callback) {
								this.callback()
							}
						});

						noteMapChanged = true
					}
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
		return noteMapChanged
	}

    connect(node: AudioNode) {
        for (let v of this.voices) {
			v.connect(node)
		}
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

    notes(): NoteDefinition[] {
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

        return notes
	}


}