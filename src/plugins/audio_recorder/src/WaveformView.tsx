import { Component, h } from "preact";
import WaveSurfer from 'wavesurfer.js';

export interface WaveformViewProps {
    context: AudioContext
    audioBuffer: AudioBuffer
}

type WaveformViewState = {}

export class WaveformView extends Component<WaveformViewProps, WaveformViewState> {
    container?: HTMLDivElement
    waveSurfer?: WaveSurfer
    loadedAudioBuffer?: AudioBuffer

    loadAudioBuffer() {
        window.setTimeout(() => {
            this.waveSurfer.loadDecodedBuffer(this.props.audioBuffer)
        }, 1)

        this.loadedAudioBuffer = this.props.audioBuffer
    }

    setup(el: HTMLDivElement | null) {
        if (!el) {
            return
        }
        if (this.container == el) {
            return
        }        
        this.container = el
        this.waveSurfer = WaveSurfer.create({
            container: el,
            responsive: true,
            waveColor: "yellow",
            audioContext: this.props.context
        })

        this.loadAudioBuffer()
    }

    render() {
        if (this.waveSurfer && (!this.loadedAudioBuffer || this.loadedAudioBuffer != this.props.audioBuffer)) {            
            this.loadAudioBuffer()
        }
        return <div style="" ref={(el) => {this.setup(el)}}></div>
    }
}