/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrNode } from 'sdk';
import { constantSource, noiseSource } from '../../shared/util'
import { MIDI, ScheduledMIDIEvent } from '../../shared/midi'

let lfoWaves: OscillatorType[] = ["triangle", "square"]

import {debug} from "debug"
var logger = debug("plugin:synth101")

let shaperLength = 44100

export default class Synth101Node extends CompositeAudioNode {
    heldNotes: boolean[];
    currentNote: number;

    // TODO: replace with ParamMgr
    parameters = {
        lfoRate : 0,
        lfoWaveform : 0,
        oscMod: 0,
        oscRange: 0,
        pulseWidth: 0,
        pwmSource: 0,
        subRange: 0,
        filterFreq: 0.35,
        filterKeyboard: 0,
        vcaSource: 0,
        envAttack: 0,
        envDecay: 0.1,
        envSustain: 0,
        envRelease: 0,
        portamentoMode: 0,
        portamentoTime: 0,
    }

    oscillator!: OscillatorNode;
    pulseGain!: GainNode;
    pulseShaper!: WaveShaperNode;
    subOsc!: OscillatorNode;
    lfo!: OscillatorNode;
    lfoPWM!: GainNode;
    lfoFilter!: GainNode;
    lfoOscMod!: GainNode;
    env!: AudioWorkletNode;
    gateSlew!: AudioWorkletNode;
    envFilter!: GainNode;
    envVCA!: GainNode;
    envPWM!: GainNode;
    kybdSource!: AudioBufferSourceNode | ConstantSourceNode;
    kybdGain!: GainNode;
    filters!: BiquadFilterNode[];
    mixerSaw!: GainNode;
    mixerPulse!: GainNode;
    mixerSub!: GainNode;
    mixerNoise!: GainNode;
    vca!: GainNode;
    stereoOut!: ChannelMergerNode;
    targetFreq: number;

	_wamNode: ParamMgrNode = undefined;

	get paramMgr(): ParamMgrNode {
		return this._wamNode;
	}

	constructor(audioContext: BaseAudioContext, options={}) {        
		super(audioContext, options);
        logger("Synth101 constructor()")
        
        // internal note-holding state
        this.heldNotes = []
        this.heldNotes.length = 128
        this.heldNotes.fill(false, 0, 128)
        this.targetFreq = 0

        this.currentNote = -1;

		this.createNodes();
	}

    async getAutomationState(): Promise<any> {
        let orig = await super.getState()        
        let state: any = {}
        Object.keys(orig).forEach(k => state[k] = orig[k].value)
                
        return state
    }

    // getState(): any {
    //     var state: any = {}
    //     this.paramMgr.parameters.forEach((v, k) => {
    //         state[k] = v.value
    //     })
    //     return state
    // }

    // async setState(state: any) {
    //     this.paramMgr.parameters.forEach((v, k) => {
    //         v.setValueAtTime(state[k], 0)
    //     })
    // }

	setup(paramMgr: ParamMgrNode) {
        // @ts-ignore
        paramMgr.addEventListener('midi', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));

        this._wamNode = paramMgr
	}

	isEnabled = true;
	set status(_sig: boolean) {
		this.isEnabled = _sig;
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
        // do I need to call super.connect even though I'm not an audio effect with an input?
//		super.connect(this._input);

        this.oscillator = this.context.createOscillator();
        this.oscillator.type = "sawtooth"

        this.pulseGain = this.context.createGain();
        this.pulseShaper = this.context.createWaveShaper();
        var curve = new Float32Array(shaperLength);
        let quarter = shaperLength/4;
        for (var i = 0; i < shaperLength; i++) {
            if (i < quarter) {
                curve[i] = -1.0;
            } else if (i > quarter * 3) {
                curve[i] = -1.0;
            } else {
                curve[i] = 1.0;
            }
        }
        
        this.pulseShaper.curve = curve;

        // subosc
        this.subOsc = this.context.createOscillator();
        this.subOsc.type = "square"
        
        // Modulators (LFO/Env)
        this.lfo = this.context.createOscillator();
        this.lfo.type = "triangle"

        this.lfoPWM = this.context.createGain();
        this.lfoFilter = this.context.createGain();
        this.lfoOscMod = this.context.createGain();

        this.lfo.connect(this.lfoPWM);
        this.lfo.connect(this.lfoOscMod);
        this.lfo.connect(this.lfoFilter);

        this.lfoOscMod.connect(this.oscillator.detune);
        this.lfoOscMod.connect(this.subOsc.detune);

        this.env = new AudioWorkletNode(this.context, 'envelope-generator-processor')
        this.gateSlew = new AudioWorkletNode(this.context, 'slew-processor')
        this.gateSlew.parameters.get("riseSpeed").setValueAtTime(0.1, 0)
        this.gateSlew.parameters.get("fallSpeed").setValueAtTime(0.1, 0)

        this.envFilter = this.context.createGain();
        this.envVCA = this.context.createGain();
        this.envPWM = this.context.createGain();

        this.kybdSource = constantSource(this.context);
        this.kybdGain = this.context.createGain();
        this.kybdSource.connect(this.kybdGain);

        this.filters = [
            this.context.createBiquadFilter(),
            this.context.createBiquadFilter(),
            this.context.createBiquadFilter(),
        ]

        this.filters.forEach(filter => {
            filter.type = "lowpass"
            this.lfoFilter.connect(filter.detune)
            this.envFilter.connect(filter.detune)
            this.kybdGain.connect(filter.detune)
        })

        this.mixerSaw = this.context.createGain();
        this.mixerPulse = this.context.createGain();
        this.mixerSub = this.context.createGain();
        this.mixerNoise = this.context.createGain();

        this.vca = this.context.createGain();
        this.vca.gain.setValueAtTime(0, 0);
        this.oscillator.start(0);
        this.lfo.start(0);
        this.subOsc.start(0);

        // saw -> mixer
        this.oscillator.connect(this.mixerSaw)
        this.mixerSaw.connect(this.filters[0])

        // generate pulse -> mixer
        this.lfoPWM.connect(this.pulseGain.gain)
        this.envPWM.connect(this.pulseGain.gain)
        this.oscillator.connect(this.pulseGain)
        this.pulseGain.connect(this.pulseShaper)
        this.pulseShaper.connect(this.mixerPulse)
        this.mixerPulse.connect(this.filters[0])

        // sub -> mixer
        this.subOsc.connect(this.mixerSub);
        this.mixerSub.connect(this.filters[0]);

        this.filters[0].connect(this.filters[1])
        this.filters[1].connect(this.filters[2])
        this.filters[2].connect(this.vca);

        // noise -> mixer
        let noise = noiseSource(this.context);
        noise.connect(this.mixerNoise);
        this.mixerNoise.connect(this.filters[0]);

        // env
        this.env.connect(this.envFilter)
        this.env.connect(this.envVCA);
        this.env.connect(this.envPWM);

        this.envVCA.connect(this.vca.gain);
        this.gateSlew.connect(this.vca.gain);

        this._output = this.context.createChannelMerger(2);
        this.vca.connect(this._output, 0, 0)
        this.vca.connect(this._output, 0, 1)

        this.updateFromState()
	}

    // MIDI note handling

    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
		midiEvents.forEach (message => {
            logger("synth got midi ", message, ", event timestamp ", message.time, "currentTime", this.context.currentTime)

            if (message.event[0] == MIDI.NOTE_ON && message.event[2] > 0) {
                let midiNote = message.event[1]
                this.noteOn(midiNote, message.time)
            } else if (message.event[0] == MIDI.NOTE_OFF || (message.event[0] == MIDI.NOTE_ON && message.event[2] == 0)) {
                let midiNote = message.event[1]
                this.noteOff(midiNote, message.time)
            }
		});
    }

    noteOn(note: number, tickStartTime: number) {
        this.heldNotes[note] = true;
        this.noteUpdate(tickStartTime)
    }

    noteOff(note: number, tickStartTime: number) {
        this.heldNotes[note] = false;
        this.noteUpdate(tickStartTime)
    }

    allNotesOff(tickStartTime: number) {
        this.heldNotes.fill(false, 0, 128);
        this.noteUpdate(tickStartTime)
    }

    setPitch(note: number, tickStartTime: number, portamento: boolean) {
        // note 69 = freq 440
        // every 12 notes, double freq

        let rangeMultiples = [0.5, 1, 2, 4]
        this.targetFreq = 440 * Math.pow(2, ((note-69)/12)) * rangeMultiples[this.parameters.oscRange]

        let time = portamento ? this.parameters.portamentoTime/5 : 0

        this.oscillator.frequency.setTargetAtTime(this.targetFreq, tickStartTime, time);
        this.subOsc.frequency.setTargetAtTime(this.targetFreq, tickStartTime, time);

        // set kybd
        this.kybdGain.gain.setTargetAtTime((note-69) * 100 * this.parameters.filterKeyboard, tickStartTime, time);      
    }

    noteUpdate(tickStartTime: number) {
        let absoluteStartTime = tickStartTime + this.context.currentTime

        // find note we should be playing
        for (var i = this.heldNotes.length-1; i >= 0; i--) {
            if (this.heldNotes[i]) {
                break
            }
        }

        if (i == -1 && this.currentNote > 0) {
            this.env.port.postMessage({event: "trigger", high: false, time: tickStartTime})
            this.gateSlew.parameters.get("input").setValueAtTime(0, tickStartTime)

            this.currentNote = -1;
        }

        if (i > -1 && this.currentNote != i) {
            let portamento = (this.parameters.portamentoMode == 2 || (this.parameters.portamentoMode == 1 && this.currentNote != -1))

            // set frequencies
            this.setPitch(i, absoluteStartTime, portamento)
            
            if (this.currentNote == -1) {
                // time to start the envelope
                this.env.port.postMessage({event: "trigger", high: true, time: tickStartTime})
                this.gateSlew.parameters.get("input").setValueAtTime(1.0, tickStartTime)
            }

            this.currentNote = i
        }
    }

    updateFromState() {
        let state = this.parameters

        if (!this.oscillator) {
            return
        }

        // sub oscillator
        if (state.subRange == 0) {
            this.subOsc.detune.setValueAtTime(-1200, 0);
        } else {
            this.subOsc.detune.setValueAtTime(-2400, 0);
        }

        let subWaves: OscillatorType[] = ["square", "square", "sine", "triangle"]
        this.subOsc.type = subWaves[state.subRange]

        // PWM
        // TODO this needs a scope on it to look at it
        if (state.pwmSource == 0) {
            this.pulseGain.gain.setValueAtTime(1.0, 0);
            this.envPWM.gain.setValueAtTime(0,0);

            this.lfoPWM.gain.setValueAtTime(state.pulseWidth * 0.2, 0);
        } else if (state.pwmSource == 1) {
            this.lfoPWM.gain.setValueAtTime(0, 0);
            this.envPWM.gain.setValueAtTime(0,0);

            this.pulseGain.gain.setValueAtTime(1.0 - (state.pulseWidth * 0.4), 0);
        } else if (state.pwmSource == 2) {
            this.pulseGain.gain.setValueAtTime(1.0, 0);

            this.lfoPWM.gain.setValueAtTime(0, 0);
            this.envPWM.gain.setValueAtTime(state.pulseWidth * -0.5, 0);
        }

        // LFO update
        this.lfo.type = lfoWaves[state.lfoWaveform]
        let lfoFrequency = 0.1 + (29.9 * state.lfoRate * state.lfoRate);
        this.lfo.frequency.setValueAtTime(lfoFrequency, 0);

        // Filter
        let baseFreq = 10 + (19990 * state.filterFreq * state.filterFreq);
        this.filters.forEach(filter => {
            filter.frequency.linearRampToValueAtTime(baseFreq, this.context.currentTime + 0.01);
        })

        if (state.vcaSource == 0) {
            this.envVCA.gain.setValueAtTime(1, 0);
            this.gateSlew.parameters.get("gain").setValueAtTime(0, 0);

        } else {
            this.envVCA.gain.setValueAtTime(0, 0);
            this.gateSlew.parameters.get("gain").setValueAtTime(1, 0);
        }
    }

}
