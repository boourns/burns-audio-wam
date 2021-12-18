export type DrumSamplerVoiceState = {
	name: string
	url: string
	note: number
}

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