/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from 'sdk';

import {ScheduledMIDIEvent} from '../../shared/midi'

export default class SimpleEQNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    lowFilter: BiquadFilterNode;
    mediumFilter: BiquadFilterNode;
    highFilter: BiquadFilterNode;

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {
		super(audioContext, options);

        console.log("SimpleEQ constructor()")

		this.createNodes();
	}

	/**
	 * @param {ParamMgrNode<Params, InternalParams>} wamNode
	 */
	setup(paramMgr: ParamMgrNode) {
        this._wamNode = paramMgr
	}

	isEnabled = true;
	set status(_sig: boolean) {
		this.isEnabled = _sig;
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
        // do I need to call super.connect even though I'm not an audio effect with an input?

        this.lowFilter = this.context.createBiquadFilter()
        this.lowFilter.type = "lowshelf"

        this.mediumFilter = this.context.createBiquadFilter()
        this.mediumFilter.type = "peaking"

        this.highFilter = this.context.createBiquadFilter()
        this.highFilter.type = "highshelf"
        this._input = this.lowFilter;

        super.connect(this._input);
        this.lowFilter.connect(this.mediumFilter)
        this.mediumFilter.connect(this.highFilter)
        
        this._output = this.highFilter
	}

    // MIDI handling
    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		
    }
}
