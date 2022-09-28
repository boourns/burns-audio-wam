/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import { ScheduledMIDIEvent } from '../../shared/midi'

export default class MIDIOutputNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode = undefined;

	callback?: () => void
	midiInitialized: boolean = false

	midiIn: WebMidi.MIDIInput[]
	midiOut: WebMidi.MIDIOutput[]
	selectedMidi?: WebMidi.MIDIOutput

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
        paramMgr.addEventListener('wam-sysex', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));

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

	async initializeMidi() {
		try {
			let midi = await navigator.requestMIDIAccess({sysex: true});

			midi.addEventListener('statechange', (event: WebMidi.MIDIConnectionEvent) => this.midiReady(event.target as WebMidi.MIDIAccess));

			this.midiReady(midi)
		} catch (err) {
			console.log('Error accessing MIDI devices: ', err);
		}	  
	}

	midiReady(midi: WebMidi.MIDIAccess) {
		// Reset.
		this.midiIn = [];
		this.midiOut = [];
		
		// MIDI devices that send you data.
		const inputs = midi.inputs.values();
		for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
			this.midiIn.push(input.value);
		}
		
		// MIDI devices that you send data to.
		const outputs = midi.outputs.values();
		for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
			this.midiOut.push(output.value);
		}

		this.midiInitialized = true

		const selected = window.WAMExtensions.userSetting.get(this.instanceId, "selectedMidiPort")
		if (selected != undefined) {
			this.selectMIDIOutput(selected)
		}

		if (this.callback) {
			this.callback()
		}
	}

	selectMIDIOutput(id: string) {
		this.selectedMidi = this.midiOut.find(midi => midi.id == id)

		if (this.selectedMidi || id == "none") {
			window.WAMExtensions.userSetting.set(this.instanceId, "selectedMidiPort", this.selectedMidi ? this.selectedMidi.id : undefined)
		}
	}

    // MIDI note handling

    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		if (!this.selectedMidi) {
			return
		}

		midiEvents.forEach (message => {
			let timeDelta = message.time - this.context.currentTime
			if (timeDelta <= 0) {
				this.selectedMidi.send(message.event)
			} else {
				this.selectedMidi.send(message.event, Date.now() + timeDelta)
			}
		});
    }
}
