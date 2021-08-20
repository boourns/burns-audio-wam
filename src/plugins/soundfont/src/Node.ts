/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from 'sdk';
import { constantSource, noiseSource } from '../../shared/util'
import { MIDI, ScheduledMIDIEvent } from '../../shared/midi'

import Soundfont, { InstrumentName } from 'soundfont-player'

export default class SoundfontPlayerNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode = undefined;

    soundfont: any
    instrument: InstrumentName = "acoustic_grand_piano"
    loadedInstrument: string = ""
    loadingInstrument: string = ""

    heldNotes: any[]

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);
        console.log("Soundfont-player constructor()")

        this.heldNotes = []
        this.heldNotes.fill(undefined, 0, 128)
        
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

        this.updateFromState()
	}

    // MIDI note handling

    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		midiEvents.forEach (message => {
            if (message.event[0] == MIDI.NOTE_ON && message.event[2] > 0) {
                let midiNote = message.event[1]
                this.noteOn(midiNote, message.time)
            } else if (message.event[0] == MIDI.NOTE_OFF || (message.event[0] == MIDI.NOTE_ON && message.event[2] == 0)) {
                let midiNote = message.event[1]
                this.noteOff(midiNote, message.time)
            }
		});
    }

    noteOn(note: number, time: number) {
        if (this.soundfont) {
            if (this.heldNotes[note]) {
                this.heldNotes[note].stop()
            }
            this.heldNotes[note] = this.soundfont.play(note, time)
        }
    }

    noteOff(note: number, time: number) {
        if (this.soundfont && this.heldNotes[note]) {
            this.heldNotes[note].stop(time)
            this.heldNotes[note] = undefined
        }
    }

    updateFromState() {
        let instrument = this.instrument
        if (this.loadedInstrument != instrument) {
            if (instrument != this.loadingInstrument) {
                this.loadingInstrument = instrument

                Soundfont.instrument(this.context as AudioContext, instrument, {destination: this._output}).then((sf: any) => {
                    this.soundfont = sf
                    this.loadedInstrument = instrument
                })
            }
        }
    }

    async setState(state: any) {
        if (state && state.instrument) {
            this.instrument = state.instrument
            this.updateFromState()
        }
    }

    async getState() {
        return {
            instrument: this.instrument
        }
    }
}
