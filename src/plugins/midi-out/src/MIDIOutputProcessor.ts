import WamParameter from "@webaudiomodules/sdk/src/WamParameter.js"
// @ts-ignore
globalThis.WamParameter = WamParameter;

import WamParameterInterpolator from "@webaudiomodules/sdk/src/WamParameterInterpolator"
import WamProcessor from "@webaudiomodules/sdk/src/WamProcessor";

// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import WamParameterInfo from "@webaudiomodules/sdk/src/WamParameterInfo";
import { AudioParamDescriptor, WamMidiEvent, WamParameterInfoMap } from "@webaudiomodules/api";
import { InstrumentDefinition, MIDIControlChange } from "./InstrumentDefinition";

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

type CCState = {
    lastValue: number
    cc: MIDIControlChange
}

class MIDIInstrumentProcessor extends WamProcessor {
    ccMap: Record<string, CCState> = {}
    parameterNames: string[] = []

    _generateWamParameterInfo(): WamParameterInfoMap {
        if (!this.instrument) {
            console.log("_generateWamParameterInfo: no instrument")
            return {}
        }

        let result: WamParameterInfoMap = {}
        let ccMap: Record<string, CCState> = {}

        let parameterNames: string[] = []

        this.instrument.midiCCs.map(cc => {
            let name = `${cc.ccNumber} - ${cc.name}`
            ccMap[name] = {
                lastValue: cc.startValue ? cc.startValue : 0,
                cc
            }
            parameterNames.push(name)

            result[name] = new WamParameterInfo(name, {
                type: "int",
                label: name,
                minValue: cc.minValue ? cc.minValue : 0,
                maxValue: cc.maxValue ? cc.maxValue : 127,
                defaultValue: cc.startValue ? cc.startValue : 0,
            })
        })

        this.parameterNames = parameterNames
        this.ccMap = ccMap

        console.log("_generateWamParameterInfo: parameters ", result)

        return result
    }

    lastTime: number
    proxyId: string
    instrument?: InstrumentDefinition

	constructor(options: any) {
		super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

        // @ts-ignore
        const { webAudioModules } = audioWorkletGlobalScope;

        // @ts-ignore
        if (globalThis.WamProcessors) globalThis.WamProcessors[instanceId] = this;
        // @ts-ignore
		else globalThis.WamProcessors = { [instanceId]: this };

        super.port.addEventListener("message", (ev: MessageEvent) => {
            if (ev.data.me) {
                console.log("Processor side: ", ev.data)
                if (ev.data.message == "instrument") {
                    console.log("Loading instrument")
                    this.instrument = new InstrumentDefinition(
                        ev.data.name, 
                        ev.data.cc,
                        ev.data.notes)
                    this._initialize()
                }
            }
        })

        super.port.postMessage({
            me: true,
            message: "hello"
        })
	}

    count = 0;

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

        for (let i = 0; i < this.parameterNames.length; i++) {
            let paramName = this.parameterNames[i]
            let cc = this.ccMap[this.parameterNames[i]]
            let value = Math.floor(this._parameterInterpolators[paramName].values[startSample])
            
            if (cc.lastValue != value) {
                cc.lastValue = value
                console.log(`Emitting ${paramName}: cc ${cc.cc.ccNumber} value ${value}`)
                this.emitEvents(
                    {
                        type: 'wam-midi', time: currentTime, data: {bytes: [0xB0,cc.cc.ccNumber, value]}
                    }
                )
            }
        }
        

		return;
	}

    _onMidi(midiData: any) {   
        this.emitEvents(
            {type:"wam-midi", time: 0, data: midiData}
        )
    }
}

try {
	registerProcessor('Tom BurnsMIDI Instrument', MIDIInstrumentProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
