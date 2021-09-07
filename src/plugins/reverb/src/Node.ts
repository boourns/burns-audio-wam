/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from 'sdk';

import {ScheduledMIDIEvent} from '../../shared/midi'
import { AudioPool } from './AudioPool';

import { getBaseUrl } from '../../shared/getBaseUrl';

export type IRListEntry = {
    name: string
    id: string
    url: string
}

export type ConvolutionReverbNodeState = {
    reverbTime: number
    ir: string
}

export default class ConvolutionReverbNode extends CompositeAudioNode {
	_wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode

    input!: GainNode
    output!: GainNode
    wet!: GainNode
    dry!: GainNode

    audioPool: AudioPool
    reverb!: ConvolverNode
    baseUrl: string

    state: ConvolutionReverbNodeState = {
        reverbTime: 1,
        ir: "large-1"
    }

    renderedReverbTime = -1
    loadedIR?: string

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, baseUrl: string, options={}) {        
		super(audioContext, options);

        this.baseUrl = baseUrl

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

    IRs(): IRListEntry[] {
        return [
            {
                id: "small-1",
                name: "Small",
                url: `${this.baseUrl}/assets/small.wav`
            },
            {
                id: "medium-1",
                name: "Medium",
                url: `${this.baseUrl}/assets/medium.wav`
            },
            {
                id: "large-1",
                name: "Large 1",
                url: `${this.baseUrl}/assets/large1.wav`
            },            {
                id: "large-2",
                name: "Large 2",
                url: `${this.baseUrl}/assets/large2.wav`
            },            {
                id: "large-3",
                name: "Large 3",
                url: `${this.baseUrl}/assets/large3.wav`
            },
            {
                id: "xlarge-1",
                name: "Extra Large",
                url: `${this.baseUrl}/assets/xlarge.wav`
            },
            {
                id: "bloom-1",
                name: "Bloom",
                url: `${this.baseUrl}/assets/bloom.wav`
            },
        ]
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

    loadIR() {
        var url: string | undefined

        if (this.state.ir.startsWith("https")) {
            url = this.state.ir
        } else if (this.state.ir.startsWith("wam-asset")) {
            // TODO: Asset Extension
        } else {
            let entry = this.IRs().find(e => e.id == this.state.ir)
            if (entry) {
                url = entry.url
            }
        }
        if (url) {
            this.audioPool.loadSample(url, (buffer: AudioBuffer) => {
                this.reverb.buffer = buffer
                this.loadedIR = this.state.ir
            });
        }
    }

    async getState(): Promise<any> {
        let params = await super.getState()
        return {
            ...this.state,
            params
        }
    }

    async setState(state: any) {
        if (state.params) {
            await super.setState(state.params)
        }
        if (state.ir) {
            this.state.ir = state.ir
        }
        if (state.reverbTime) {
            this.state.reverbTime = state.reverbTime
        }
        this.updateFromState()
    }

    updateFromState() {
        if (this.state.ir != this.loadedIR) {
            this.loadIR()
        }

        if (this.state.reverbTime != this.renderedReverbTime) {
            //this.renderTail()
        }
    }
}
