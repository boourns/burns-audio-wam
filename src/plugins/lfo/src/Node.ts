/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '../../sdk';

export default class LFONode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    output!: GainNode
    oscillator!: OscillatorNode

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {
		super(audioContext, options);

        console.log("LFONode constructor()")

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
        this.oscillator = this.context.createOscillator()
        this.oscillator.start()
		this.output = this.context.createGain()
		this.oscillator.connect(this.output)
		this.output.gain.setValueAtTime(0.1, 0)
        this._output = this.output
	}
}
