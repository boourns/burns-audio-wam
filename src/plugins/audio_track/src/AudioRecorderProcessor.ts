import { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";

type ClipSettings = {
    clipEnabled: boolean
    loopEnabled: boolean
    startingOffset: number // in samples
    loopStartBar: number // in bars
    loopLengthBars: number // in bars
}

const getAudioRecorderProcessor = (moduleId: string) => {
    const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
    const WamProcessor = ModuleScope.WamProcessor

    class AudioClip {
        channels: Float32Array[]
        token: string;

        clipSettings: ClipSettings;

        constructor(token: string, channels: Float32Array[]) {
            this.token = token
            this.channels = channels
            this.clipSettings = {
                clipEnabled: false,
                loopEnabled: false,
                startingOffset: 0,
                loopStartBar: 0,
                loopLengthBars: 8,
            }
        }

        setClipSettings(settings: ClipSettings) {
            this.clipSettings = settings   
        }

        writeInto(transport: WamTransportData, playhead: number, startSample: number, endSample: number, output: Float32Array[]) {
            const { sampleRate } = audioWorkletGlobalScope

            if (!this.clipSettings.clipEnabled || this.channels.length == 0 || this.channels[0].length == 0) {
                return
            }

            if (this.clipSettings.loopEnabled) {
                const loopStartTime = (this.clipSettings.loopStartBar * transport.timeSigNumerator) * 60 / transport.tempo
                const loopStartSample = this.clipSettings.startingOffset + Math.floor(loopStartTime * sampleRate)
                const loopLength = (this.clipSettings.loopLengthBars * transport.timeSigNumerator) * 60 / transport.tempo
                const loopLengthSamples = Math.floor(loopLength)

                for (let chan = 0; chan < output.length; chan++) {
                    let pos = loopStartSample + (playhead % loopLengthSamples)
                    let readChan = chan % this.channels.length

                    for (let i = startSample; i <= endSample; i++) {
                        if (pos < this.channels[readChan].length) {
                            output[chan][i] += this.channels[readChan][pos]
                        }
                        pos++
                        if (pos > loopStartSample + loopLengthSamples) {
                            pos = loopStartSample + (playhead % loopLengthSamples)
                        }
                    }
                }
            } else {
                playhead += this.clipSettings.startingOffset

                if (playhead > this.channels[0].length) {
                    return
                }

                for (let chan = 0; chan < output.length; chan++) {
                    let pos = playhead
                    let readChan = chan % this.channels.length
                    for (let i = startSample; i <= endSample; i++) {
                        output[chan][i] += this.channels[readChan][pos]
                        pos++
                        if (pos > this.channels[0].length) {
                            i = endSample
                        }
                    }
                }
            }
        }
    }

    class AudioRecorderProcessor extends WamProcessor {
        recordingArmed: boolean
        recordingActive: boolean

        transportData?: WamTransportData
        clips: Map<string, AudioClip[]>

        monitor: boolean

        samplesElapsed: number
        playing: boolean
        pendingClipId?: string
        currentClipId: string
        lastBar: number

        constructor(options: any) {
            super(options);

            const {
                moduleId,
                instanceId,
            } = options.processorOptions;

            this.recordingArmed = false
            this.monitor = false

            this.clips = new Map()

            super.port.start();
        }

        startRecording() {
            this.recordingArmed = true
        }

        stopRecording() {
            this.recordingArmed = false
        }

        finalizeSample() {
            console.log("Finalizing sample")
            this.port.postMessage({ source: "ar", clipId: this.currentClipId, action: "finalize" })
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

            if (this.monitor) {
                for (let i = 0; i < inputs.length; i++) {
                    for (let j = 0; j < inputs[i].length; j++) {
                        // iterate over channels L/R/A/B/C/...

                        for (let k = 0; k < inputs[i][j].length; k++) {
                            // iterate over individual samples

                            // TODO faster copy is available im sure
                            outputs[i][j][k] = inputs[i][j][k]
                        }
                    }
                }
            }

            // we are not playing
            if (!this.transportData || !this.transportData.playing) {
                // we were recording
                if (this.recordingActive) {
                    this.finalizeSample()

                    // transport has stopped, we were recording.. now we are not
                    this.recordingActive = false
                }

                this.playing = false

                return
            }

            // playing is true
            // but is it starting in the future?
            let { currentTime } = audioWorkletGlobalScope

            if (this.transportData.currentBarStarted > currentTime) {
                // we are in count-in
                return
            }

            var timeElapsed = currentTime - this.transportData!.currentBarStarted
            var beatPosition = (this.transportData!.currentBar * this.transportData!.timeSigNumerator) + ((this.transportData!.tempo / 60.0) * timeElapsed)
            var currentBar = Math.floor(beatPosition / this.transportData.timeSigNumerator)

            // we just started playing
            if (!this.playing) {
                // transport just started
                this.playing = true
                this.samplesElapsed = 0
                if (this.pendingClipId) {
                    this.currentClipId = this.pendingClipId
                    this.pendingClipId = undefined
                }

                // recording is fully armed 
                if (this.recordingArmed) {
                    this.recordingActive = true
                }
                this.lastBar = currentBar
            }

            if (currentBar != this.lastBar) {
                // we just crossed the bar threshold

                let recordingJustStarted = false

                if (this.recordingActive && !this.recordingArmed) {
                    // we were recording but they unclicked the 'rec' button

                    // finalize the sample and stop recording
                    this.finalizeSample()

                    this.recordingActive = false
                }


                if (!this.recordingActive && this.recordingArmed) {
                    // we were not recording but they clicked the 'rec' button

                    this.recordingActive = true
                    recordingJustStarted = true
                }

                if (this.pendingClipId) {
                    // there is a pending clip change

                    // if we're recording and didn't just start recording, finalize the old recording and start a new recording for the new clip
                    if (this.recordingActive && !recordingJustStarted) {
                        this.finalizeSample()
                    }

                    this.currentClipId = this.pendingClipId
                    this.pendingClipId = undefined
                }


                // TODO: adjust loop positions if our playing clips loop back at this position

                this.lastBar = currentBar
            }

            if (this.recordingActive && channels.length > 0) {
                // not 100% necessary right now but if we change this to keep audio on processor side always then
                // it will be required again since I/O buffers get reused

                let copy: Float32Array[] = channels.map(c => {
                    let result = new Float32Array(c.length)
                    for (let j = 0; j < c.length; j++) {
                        result[j] = c[j]
                    }
                    return result
                })

                this.port.postMessage({ source: "ar", clipId: this.currentClipId, buffer: { startSample, endSample, channels: copy } })
            }

            if (!this.recordingActive) {
                // do not play back track if currently recording
                let clips = this.clips.get(this.currentClipId) ?? []

                for (let take of clips) {
                    take.writeInto(this.transportData, this.samplesElapsed, startSample, endSample, outputs[0])
                }

                this.samplesElapsed += (endSample - startSample)
            }
            
            return;
        }

        _onMidi(midiData: any) {

        }

        _onTransport(transportData: WamTransportData) {
            this.transportData = transportData

            super.port.postMessage({
                source: "ar",
                action: "transport",
                transport: transportData
            })
        }

        // /**
        //  * Messages from main thread appear here.
        //  * @param {MessageEvent} message
        //  */
        async _onMessage(message: any): Promise<void> {
            if (message.data && message.data.source == "ar") {
                if (message.data.action == "record") {
                    console.log("Received recording message: ", message.data)
                    if (message.data.recording) {
                        this.startRecording()
                    } else {
                        this.stopRecording()
                    }
                }

                if (message.data.action == "monitor") {
                    this.monitor = message.data.monitor
                }

                if (message.data.action == "load") {
                    console.log("Received track load: ", message.data)

                    let newClip = new AudioClip(message.data.token, message.data.buffer)
                    newClip.setClipSettings(message.data.settings)

                    if (!this.clips.get(message.data.clipId)) {
                        this.clips.set(message.data.clipId, [])
                    }
                    this.clips.get(message.data.clipId).push(newClip)
                    
                } else if (message.data.action == "delete") {
                    console.log("Processor removing track ", message.data.token, "on clip ", message.data.clipId)

                    let existing = this.clips.get(message.data.clipId)
                    if (!existing) {
                        return
                    }
                    existing = existing.filter(s => s.token !== message.data.token)
                    this.clips.set(message.data.clipId, existing)
                } else if (message.data.action == "play") {
                    console.log("received play message for clipId %s", message.data.clipId)
                    this.pendingClipId = message.data.clipId
                } else if (message.data.action == "clipSettings") {
                    console.log("Received clip settings for track %s", message.data.token)
                    let clip = this.clips.get(message.data.clipId)
                    if (!clip) {
                        return
                    }
                    let existing = clip.find(take => take.token == message.data.token)
                    if (existing) {
                        existing.setClipSettings(message.data.clipSettings)
                    }
                }
            } else {
                // @ts-ignore
                super._onMessage(message)
            }
        }
    }

    try {
        registerProcessor('TomBurnsAudioTrack', (AudioRecorderProcessor as typeof WamProcessor));
    } catch (error) {
    }

    return AudioRecorderProcessor;
}

export default getAudioRecorderProcessor