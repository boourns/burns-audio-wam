/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import { ScheduledMIDIEvent } from '../../shared/midi'

export default class MIDIOutputNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode = undefined;

	midiIn: WebMidi.MIDIInput[]
	midiOut: WebMidi.MIDIOutput[]
	selectedMIDIOutput: number = -1

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);
        
		this.createNodes();
	}

	setup(paramMgr: ParamMgrNode) {
        // @ts-ignore
        paramMgr.addEventListener('wam-midi', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));

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

    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		if (this.selectedMIDIOutput < 0) {
			return
		}

		let output = this.midiOut[this.selectedMIDIOutput]
		if (!output) {
			return
		}

		midiEvents.forEach (message => {
			let timeDelta = message.time - this.context.currentTime
			if (timeDelta <= 0) {
				console.log("Sending to output: ", message.event)
				output.send(message.event)
			} else {
				output.send(message.event, Date.now() + timeDelta)
			}
		});
    }
}
