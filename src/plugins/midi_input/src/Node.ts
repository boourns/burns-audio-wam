/* eslint-disable no-underscore-dangle */
import { WamMidiData } from '@webaudiomodules/api';
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import { number } from 'lib0';
import { ScheduledMIDIEvent } from '../../shared/midi'

export default class MIDIInputNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode = undefined;

	midiIn: WebMidi.MIDIInput[]
	midiOut: WebMidi.MIDIOutput[]
	selectedDevice: number = -1

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);
        
		this.midiMessageReceived = this.midiMessageReceived.bind(this)

		this.createNodes();
	}

	setup(paramMgr: ParamMgrNode) {
        // @ts-ignore

        this._wamNode = paramMgr
	}

	isEnabled = true;
	set status(_sig: boolean) {
		this.isEnabled = _sig;
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
        this._output = this.context.createGain()
	}

    // MIDI note handling

	selectMIDIInput(index: number) {
		if (this.selectedDevice >= 0) {
			this.midiIn[this.selectedDevice].removeEventListener('midimessage', this.midiMessageReceived)
		}
		this.selectedDevice = index
		if (index >= 0) {
			this.midiIn[index].addEventListener('midimessage', this.midiMessageReceived)
		}
	}

	midiMessageReceived(event: any) {
		const bytes: [number, number, number] = [event.data[0], event.data[1], event.data[2]]

		const midi: WamMidiData = {bytes}

		console.log("Emitting midi: ", midi)

		if (event.data.length <= 3) {
			this.emitEvents({
				type:"wam-midi",
				data: {
					bytes: bytes
				}
			})
		}
    }
}
