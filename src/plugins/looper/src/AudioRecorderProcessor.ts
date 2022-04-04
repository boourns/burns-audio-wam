import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";
import { number } from "lib0";

type BufferEntry = {    
    /** What sample within the audio recording does this slice start playing */
    position: number

    /** What sample is the first sample to read from channels[][] */
    startSample: number

    /** What sample is the last sample to read from channels[][] */
    endSample: number

    /** How many samples are in this buffer */
    sampleCount: number

    /** The original sample array */
    channels: Float32Array[]
}

const getAudioRecorderProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
	const WamProcessor = ModuleScope.WamProcessor
    
    class AudioRecording {
        buffers: BufferEntry[]
        length: number

        playhead: number
        index: number
        offset: number

        constructor() {
            this.index = 0
            this.buffers = []
            this.length = 0
        }

        append(startSample: number, endSample: number, channels: Float32Array[]) {
            this.buffers.push({
                position: this.length,
                startSample,
                endSample,
                sampleCount: endSample - startSample,
                channels
            })
        }

        transportTo(playhead: number) {
            this.index = 0
            this.playhead = playhead

            while (true) {
                let buffer = this.buffers[this.index]
                if (playhead >= buffer.sampleCount) {
                    playhead -= buffer.sampleCount
                    this.index++
                    if (this.index >= this.buffers.length) {
                        this.index = this.buffers.length
                        this.offset = 0
                        return
                    }
                } else {
                    this.offset = buffer.startSample + playhead
                    return
                }

            }
        }

        writeInto(playhead: number, startSample: number, endSample: number, output: Float32Array[]) {
            if (playhead != this.playhead) {
                this.transportTo(playhead)
            }

            let pos = startSample

            for (pos = startSample; pos <= endSample && this.index < this.buffers.length; pos++) {
                
                for (let i = 0; i < output.length; i++) {
                    output[i][pos] = this.buffers[this.index].channels[i][this.offset]
                }

                this.offset++

                if (this.offset > this.buffers[this.index].endSample) {
                    this.index++
                    if (this.index < this.buffers.length) {
                        this.offset = this.buffers[this.index].startSample
                    }
                }
            }

            this.playhead += (endSample - startSample)
        }
    }
		
    class AudioRecorderProcessor extends WamProcessor {
        recordingArmed: boolean
        transportData?: WamTransportData
        takes: AudioRecording[]

        samplesElapsed: number
        playing: boolean

        constructor(options: any) {
            super(options);

            const {
                moduleId,
                instanceId,
            } = options.processorOptions;

            this.recordingArmed = false
            this.takes = []

            super.port.start();
        }

        startRecording() {
            this.recordingArmed = true
        }

        stopRecording() {
            this.recordingArmed = false
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

            const { currentTime } = audioWorkletGlobalScope;

            if (!this.transportData || !this.transportData.playing) {
                if (this.activeRecording) {
                    this.port.postMessage({source: "ar", index: this.activeRecording.index, action: "finalize"})

                    this.takes.push(this.activeRecording)

                    // transport has stopped, we were recording.. now we are not
                    this.activeRecording = undefined
                }

                this.playing = false

                return
            }

            if (!this.playing && this.transportData.playing) {
                // transport just started
                this.playing = true
                this.samplesElapsed = 0

                if (this.recordingArmed && inputs[0].length > 0) {
                    this.activeRecording = new AudioRecording()
                }
            }

            if (this.activeRecording) {
                let copy: Float32Array[] = channels.map(c => {
                    let result = new Float32Array(c.length)
                    for (let j = 0; j < c.length; j++) {
                        result[j] = c[j]
                    }
                    return result
                })
                
                this.activeRecording.append(startSample, endSample, copy)

                this.port.postMessage({source: "ar", buffer: {startSample, endSample, channels: copy}})
            }

            if (this.takes.length > 0) {
                this.takes[this.takes.length-1].writeInto(this.samplesElapsed, startSample, endSample, outputs[0])
            }

            this.samplesElapsed += (endSample - startSample)

            for (let i = 0; i < inputs.length; i++) {
                for (let j = 0; j < inputs[i].length; j++) {
                    // iterate over channels L/R/A/B/C/...

                    for (let k = 0; k < inputs[i][j].length; k++) {
                        // iterate over individual samples

                        // TODO faster copy is available im sure
                        outputs[i][j][k] += inputs[i][j][k]
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