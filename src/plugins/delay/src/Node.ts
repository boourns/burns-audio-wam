/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import {ScheduledMIDIEvent} from '../../shared/midi'

export default class DelayPluginNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    stereoMode: number;
    in: GainNode;
    splitter: ChannelSplitterNode;
    straightGains: GainNode[];
    crossGains: GainNode[];
    delays: DelayNode[];
    stereoDelay: DelayNode;
    merger: ChannelMergerNode;
    lowpass: BiquadFilterNode;
    highpass: BiquadFilterNode;
    feedback: GainNode;
    wet: GainNode;
    dry: GainNode;

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(context: BaseAudioContext, options={}) {
		super(context, options);

        console.log("DelayNode constructor()")

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
        this.stereoMode = -1

        this.in = this.context.createGain()
        this._input = this.in;

        this.splitter = this.context.createChannelSplitter(2)

        this.straightGains = [
            this.context.createGain(),
            this.context.createGain(),
        ]
        this.crossGains = [
            this.context.createGain(),
            this.context.createGain(),  
        ]
        this.delays = [
            this.context.createDelay(10),
            this.context.createDelay(10),
        ]
        this.stereoDelay = this.context.createDelay()
        this.merger = this.context.createChannelMerger(2)
        this.lowpass = this.context.createBiquadFilter()
        this.lowpass.type = "lowpass"
        this.highpass = this.context.createBiquadFilter()
        this.highpass.type = "highpass"
        this.feedback = this.context.createGain()
        this.wet = this.context.createGain()
        this.dry = this.context.createGain()

        super.connect(this._input);

        this._output = this.context.createGain()

        //this.in.connect(this._output)

        this.in.connect(this.splitter)
        this.splitter.connect(this.straightGains[0], 0)
        this.splitter.connect(this.straightGains[1], 1)
        this.splitter.connect(this.crossGains[1], 0)
        this.splitter.connect(this.crossGains[0], 1)

        for (var i = 0; i < 2; i++) {
            this.straightGains[i].connect(this.delays[i])
            this.crossGains[i].connect(this.delays[i])
        }
        this.delays[0].connect(this.merger, 0, 0)
        this.delays[1].connect(this.stereoDelay)
        this.stereoDelay.connect(this.merger, 0, 1)
        this.merger.connect(this.lowpass)
        this.lowpass.connect(this.highpass)
        this.highpass.connect(this.feedback)
        this.feedback.connect(this.splitter)
        this.highpass.connect(this.wet)

        this.in.connect(this.dry)

        this.dry.connect(this._output)
        this.wet.connect(this._output)
	}

    // MIDI handling
    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		
    }
}
