import { AudioWorkletGlobalScope } from "@webaudiomodules/api";

const moduleId = 'TomBurnsthreejs-example'
const PPQN = 24

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor

class VideoGenProcessor extends WamProcessor {
    _generateWamParameterInfo() {
        return {
        }
    }

    lastTime: number
    proxyId: string

	constructor(options: any) {
		super(options);

        const {
			moduleId,
			instanceId,
		} = options.processorOptions;

        super.port.start();
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
        const { currentTime } = audioWorkletGlobalScope;

		return;
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
        } break;
        case 0x90: { /* note on */
        } break;
        
        default: { 
         } break;
        }
    }
}

try {
	audioWorkletGlobalScope.registerProcessor(moduleId, VideoGenProcessor as typeof WamProcessor);
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
