import { MIDI } from "../../shared/midi";

import WamParameter from "sdk/src/WamParameter.js"
// @ts-ignore
globalThis.WamParameter = WamParameter;

import WamParameterInterpolator from "sdk/src/WamParameterInterpolator"
import WamProcessor from "sdk/src/WamProcessor";



const PPQN = 96

// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import WamParameterInfo from "sdk/src/WamParameterInfo";

interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
    name: string,
    processorCtor: (new (
        options?: AudioWorkletNodeOptions
    ) => AudioWorkletProcessor) & {
        parameterDescriptors?: AudioParamDescriptor[];
    }
): undefined;

const audioWorkletGlobalScope = globalThis;

// other variables that could be included:
// - renderAhead: number - how far into the future should plugins render?

class SpectrumModalProcessor extends WamProcessor {
	// @ts-ignore
    static generateWamParameterInfo() {
        return {
            exciterEnvShape: new WamParameterInfo('exciterEnvShape', {
                type: 'float',
                label: 'Exciter: Env Shape',
                defaultValue: 0,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterBowLevel: new WamParameterInfo('exciterBowLevel', {
                type: 'float',
                label: 'Bow Level',
                defaultValue: 0,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterBowTimbre: new WamParameterInfo('exciterBowTimbre', {
                type: 'float',
                label: 'Bow Timbre',
                defaultValue: 0,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterBlowLevel: new WamParameterInfo('exciterBlowLevel', {
                type: 'float',
                label: 'Blow Level',
                defaultValue: 0,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterBlowMeta: new WamParameterInfo('exciterBlowMeta', {
                type: 'float',
                label: 'Blow Meta',
                defaultValue: 0,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterBlowTimbre: new WamParameterInfo('exciterBlowTimbre', {
                type: 'float',
                label: 'Blow Timbre',
                defaultValue: 0,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterStrikeLevel: new WamParameterInfo('exciterStrikeLevel', {
                type: 'float',
                label: 'Strike Level',
                defaultValue: 0.7,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterStrikeMeta: new WamParameterInfo('exciterStrikeMeta', {
                type: 'float',
                label: 'Strike Meta',
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            exciterStrikeTimbre: new WamParameterInfo('exciterStrikeTimbre', {
                type: 'float',
                label: 'Strike Timbre',
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            resonatorGeometry: new WamParameterInfo('resonatorGeometry', {
                type: 'float',
                label: 'Resonator Geometry',
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            resonatorBrightness : new WamParameterInfo('resonatorBrightness', {
                type: 'float',
                label: 'Resonator Brightness',
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            resonatorDamping : new WamParameterInfo('resonatorDamping', {
                type: 'float',
                label: 'Resonator Damping',
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            resonatorPosition : new WamParameterInfo('resonatorPosition', {
                type: 'float',
                label: 'Resonator Position',
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 1.0,
            }),
            space : new WamParameterInfo('space', {
                type: 'float',
                label: 'Space',
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 2.0,
            }),
            resonatorModel: new WamParameterInfo('resonatorModel', {
                type: 'choice',
                choices: ["Modal", "Non-linear", "Chords", "Ominous"],
                defaultValue: 0,
            })
        }
    }

    lastTime: number
    proxyId: string
    renderedFramePos: number
    renderedFrameLength: number

    kernel: any
    synth: any

    noteHeld: boolean
    midiNote: number

    currentValues: Record<string, number> = {}

	constructor(options: any) {
		super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

        // @ts-ignore
        const { sampleRate, webAudioModules } = audioWorkletGlobalScope;

        // @ts-ignore
        this.kernel = Module()
        this.synth = new this.kernel.ModalState()

        this.synth.init(sampleRate)
        this.renderedFramePos = 0
        this.renderedFrameLength = 0
        this.noteHeld = false
        this.midiNote = 1

        // @ts-ignore
        if (globalThis.WamProcessors) globalThis.WamProcessors[instanceId] = this;
        // @ts-ignore
		else globalThis.WamProcessors = { [instanceId]: this };

        super.port.start();
	}

    count = 0;

    updateParameter(p: string, startSample: number) {
        // // @ts-ignore
        // console.log(this._parameterInterpolators)

        // // @ts-ignore
        // if (!this._parameterInterpolators[p]) {
        //     console.log("The problem is ", p)
        // }

        // @ts-ignore
        if (this._parameterInterpolators[p].values[startSample] != this.currentValues[p]) {
            // @ts-ignore
            var v = this._parameterInterpolators[p].values[startSample]
            this.currentValues[p] = v

            this.synth[p](v)
        }
    }

	/**
	 * Implement custom DSP here.
	 * @param {number} startSample beginning of processing slice
	 * @param {number} endSample end of processing slice
	 * @param {Float32Array[][]} inputs
	 * @param {Float32Array[][]} outputs
	 */
     _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
        // @ts-ignore
        const { webAudioModules, currentTime } = audioWorkletGlobalScope;
        var output = outputs[0];

        this.updateParameter("exciterEnvShape", startSample)
        this.updateParameter("exciterBowLevel", startSample)
        this.updateParameter("exciterBowTimbre", startSample)
        this.updateParameter("exciterBlowLevel", startSample)
        this.updateParameter("exciterBlowMeta", startSample)
        this.updateParameter("exciterBlowTimbre", startSample)
        this.updateParameter("exciterStrikeLevel", startSample)
        this.updateParameter("exciterStrikeMeta", startSample)
        this.updateParameter("exciterStrikeTimbre", startSample)
        this.updateParameter("resonatorGeometry", startSample)
        this.updateParameter("resonatorBrightness", startSample)
        this.updateParameter("resonatorDamping", startSample)
        this.updateParameter("resonatorPosition", startSample)
        this.updateParameter("space", startSample)
        this.updateParameter("resonatorModel", startSample)

        while (startSample < endSample) {
            if (this.renderedFramePos == this.renderedFrameLength) {
                // @ts-ignore
                this.renderedFrameLength = this.synth.process(this.noteHeld, this.midiNote);
                this.renderedFramePos = 0;
            }

            output[0][startSample] = this.synth.mainVal(this.renderedFramePos);
            output[1][startSample] = this.synth.auxVal(this.renderedFramePos);
            
            this.renderedFramePos++;
            startSample++;
        }

		return true;
	}

    _onMidi(midiData: any) {        
        // @ts-ignore
        const { currentTime } = audioWorkletGlobalScope;

        // /* eslint-disable no-lone-blocks */
        const bytes = midiData.bytes;
        let type = bytes[0] & 0xf0;
        const channel = bytes[0] & 0x0f;
        const data1 = bytes[1];
        const data2 = bytes[2];

        if (type === 0x90 && data2 === 0) type = 0x80;

        switch (type) {
        case 0x80: { /* note off */
            //this.chordOff(data1, data2)
            this.noteHeld = false

        } break;
        case 0x90: { /* note on */
            this.noteHeld = true
            this.midiNote = data1            
        } break;
        
        default: { 
            this.emitEvents(
                {type:"midi", time: currentTime, data: midiData}
            )
         } break;
        }
    }
}

try {
	registerProcessor('TomBurnsSpectrum: Modal', SpectrumModalProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}