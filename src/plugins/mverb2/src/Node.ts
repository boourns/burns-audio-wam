/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from 'sdk';

import {ScheduledMIDIEvent} from '../../shared/midi'
import { AudioPool } from './AudioPool';

export default class ConvolutionReverbNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    input!: GainNode
    output!: GainNode
    wet!: GainNode
    dry!: GainNode

    audioPool: AudioPool
    reverb!: ConvolverNode

    state = {
        reverbTime: 1,
    }

    renderedReverbTime = -1

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {
		super(audioContext, options);

        console.log("ConvolutionReverbNode constructor()")
        this.audioPool = new AudioPool(audioContext)

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
		this.isEnabled = _sig
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
        this.reverb = this.context.createConvolver()
        this.input = this.context.createGain()
        this.output = this.context.createGain()
		this.wet = this.context.createGain()
        this.dry = this.context.createGain()

        this.input.connect(this.wet)
        this.wet.connect(this.reverb)
		this.reverb.connect(this.output)
        this.input.connect(this.dry)
        this.dry.connect(this.output)
		
        this._input = this.input

        super.connect(this._input)
        this._output = this.output

        this.updateFromState()

        this.audioPool.loadSample("https://burns.ca/static/mverb2.wav", (buffer: AudioBuffer) => {
            console.log("IR loaded")
            this.reverb.buffer = buffer
        });
	}

    // MIDI handling
    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		
    }

    renderTail() {
        let length = this.context.sampleRate * this.state.reverbTime
        var buffer = this.context.createBuffer(2, length, this.context.sampleRate);

        for (var j = 0; j < 2; j++) {
            var noise = buffer.getChannelData(j)
            for (var i = 0; i < length; i++) {
                noise[i] = ((Math.random() * 2) - 1) * (1-(i/length))
            }
        }

        this.reverb.buffer = buffer
        this.renderedReverbTime = this.state.reverbTime
    }

    updateFromState() {
        if (this.state.reverbTime != this.renderedReverbTime) {
            //this.renderTail()
        }
    }

}
