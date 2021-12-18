/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode} from '@webaudiomodules/sdk-parammgr'
import { ScheduledMIDIEvent } from '../../shared/midi'
import { DrumSamplerKit } from './Kit'

export const NUM_VOICES = 16

export class DrumSamplerNode extends CompositeAudioNode {
	compressor: DynamicsCompressorNode
	kit: DrumSamplerKit
	paramMgr: ParamMgrNode

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);
		this.kit = new DrumSamplerKit(NUM_VOICES, audioContext)

		this.createNodes();
	}

	async getState(): Promise<any> {
		let state = {
			params: await super.getState(),
			slots: [...this.kit.state.slots.map(v => { return {...v} })]
		}

		return state
	}

	async setState(state: any) {
		if (state.params) {
			await super.setState(state.params)
		}
		if (state.slots) {
			this.kit.updateSlots(state.slots)
			this.updateNoteExtension()
		}
	}

	setup(paramMgr: ParamMgrNode) {
        // @ts-ignore
        paramMgr.addEventListener('wam-midi', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));

        this._wamNode = paramMgr
		this.paramMgr = paramMgr

		this.kit.updateSlots([
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
        this.kit.processMIDIEvents(midiEvents)
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
		this.kit.connect(this.compressor)
	}

	updateNoteExtension() {
		if (!(window.WAMExtensions && window.WAMExtensions.notes)) {
			return
		}

		let notes = this.kit.notes()

		window.WAMExtensions.notes.setNoteList(this.instanceId, notes)
	}

}
