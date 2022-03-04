import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";

const getAudioRecorderProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
	const WamProcessor = ModuleScope.WamProcessor
	const WamParameterInfo = ModuleScope.WamParameterInfo
		
    class AudioRecorderProcessor extends WamProcessor {
        recording: boolean
        transportData?: WamTransportData

        // @ts-ignore
        _generateWamParameterInfo() {
            return {}
        }

        constructor(options: any) {
            super(options);

            const {
                moduleId,
                instanceId,
            } = options.processorOptions;

            this.recording = false

            super.port.start();
        }

        startRecording() {
            this.recording = true
        }

        stopRecording() {
            this.recording = false
        }

        /**
         * Implement custom DSP here.
         * @param {number} startSample beginning of processing slice
         * @param {number} endSample end of processing slice
         * @param {Float32Array[][]} inputs
         * @param {Float32Array[][]} outputs
         */
        _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
            let channels = inputs[0]

            if (this.recording) {
                this.port.postMessage({source: "ar", buffer: {startSample, endSample, channels}})
            }

            for (let i = 0; i < inputs.length; i++) {
                for (let j = 0; j < inputs[i].length; j++) {
                    for (let k = 0; k < inputs[i][j].length; k++) {
                        // TODO faster copy is available im sure
                        outputs[i][j][k] = inputs[i][j][k]
                    }
                }
            }

            return;
        }

        _onMidi(midiData: any) {        
            
        }

        _onTransport(transportData: WamTransportData) {
            this.transportData = transportData
    
            super.port.postMessage({
                event:"transport",
                transport: transportData
            })
        }

        // /**
        //  * Messages from main thread appear here.
        //  * @param {MessageEvent} message
        //  */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.source == "ar") {
                if (message.data.recording) {
                    console.log("Processor starting to record")
                    this.startRecording()

                } else {
                    console.log("Processor stopping recording")
                    this.stopRecording()

                }
            } else {
                // @ts-ignore
                super._onMessage(message)
            }
        }
    }

    try {
		registerProcessor('TomBurnsAudioRecorder', (AudioRecorderProcessor as typeof WamProcessor));
	} catch (error) {
		console.warn(error);
	}

	return AudioRecorderProcessor;
}

export default getAudioRecorderProcessor