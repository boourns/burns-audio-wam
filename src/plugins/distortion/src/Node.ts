/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '../../sdk';
import { constantSource } from '../../shared/util';

import {ScheduledMIDIEvent} from '../../shared/midi'

const shaperLength = 1000
const tanhMultiple = 1

export default class DistortionNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    offset: ConstantSourceNode | AudioBufferSourceNode;
    offsetGain: GainNode;
    overdrive: GainNode;
    shaper: WaveShaperNode;
    level: GainNode;
    currentFlavor: number;
    renderedFlavor: number;
    maxCurveValue: number;

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {
		super(audioContext, options);

        console.log("DistortionNode constructor()")

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
        this.maxCurveValue = 1.0

        this.offset = constantSource(this.context);
        this.offsetGain = this.context.createGain();

        this.overdrive = this.context.createGain();
        this.shaper = this.context.createWaveShaper();
        this.level = this.context.createGain();
        
        this._input = this.overdrive;

        this.overdrive.connect(this.shaper);
        this.offset.connect(this.offsetGain);
        this.offsetGain.connect(this.shaper);
        
        this.shaper.connect(this.level);
        this.currentFlavor = 0;
        this.renderedFlavor = -1;

        super.connect(this._input);
        this._output = this.shaper

        this.updateFromState()
	}

    // MIDI handling
    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		
    }

    updateFlavor() {
        this.maxCurveValue = 0.0;
        this.renderedFlavor = this.currentFlavor;

        var curve = new Float32Array(shaperLength);
        let mid = shaperLength/2;
        let quarter = shaperLength/4;

        switch(this.currentFlavor) {
            case 0: {
                for (var i = 0; i < shaperLength; i++) {
                    let position = tanhMultiple*(i-mid)/shaperLength;

                    curve[i] = Math.tanh(position);
                    if (curve[i] > 1) {
                        curve[i] = 1;
                    }
                    if (curve[i] < -1) {
                        curve[i] = -1;
                    }

                    if (Math.abs(curve[i]) > this.maxCurveValue) {
                        this.maxCurveValue = Math.abs(curve[i])
                    }
                }
                break;
            }
            case 1: {
                for (var i = 0; i < shaperLength; i++) {
                    if (i < quarter) {
                        curve[i] = -1.0;
                    } else if (i > quarter*3) {
                        curve[i] = 1.0
                    } else {
                        curve[i] = (2 * (i - quarter) / mid) - 1;
                    }
                }

                this.maxCurveValue = 1.0;

                break;
            }
        }

        this.shaper.curve = curve;
    }

    updateFromState() {
        if (this.currentFlavor != this.renderedFlavor) {
            this.updateFlavor();
        }
    }

}
