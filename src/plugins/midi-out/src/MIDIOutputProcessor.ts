import WamParameter from "@webaudiomodules/sdk/src/WamParameter.js"
// @ts-ignore
globalThis.WamParameter = WamParameter;

import WamParameterInterpolator from "@webaudiomodules/sdk/src/WamParameterInterpolator"
import WamProcessor from "@webaudiomodules/sdk/src/WamProcessor";

// @ts-ignore
globalThis.WamParameterInterpolator = WamParameterInterpolator

import WamParameterInfo from "@webaudiomodules/sdk/src/WamParameterInfo";
import { AudioParamDescriptor, WamParameterInfoMap } from "@webaudiomodules/api";

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

class MIDIOutputProcessor extends WamProcessor {
    _generateWamParameterInfo(): WamParameterInfoMap {
        let result: WamParameterInfoMap = {}

        return result
    }

    lastTime: number
    proxyId: string

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

		return;
	}

    _onMidi(midiData: any) {   
        super.port.postMessage({
            me: true,
            message: "midi",
            data: midiData
        })
    }
}

try {
	registerProcessor('Tom BurnsMIDI Output', MIDIOutputProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
