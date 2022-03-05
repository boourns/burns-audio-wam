import { Component, h } from "preact";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';

export type RegionAction = {
    label: string
    action: () => {}
}

export interface WaveformViewProps {
    context: AudioContext
    audioBuffer: AudioBuffer
    regionActions: RegionAction[]
    onSeek?: (pos: number) => void
}

type WaveformViewState = {}

export class WaveformEditorView extends Component<WaveformViewProps, WaveformViewState> {
    container?: HTMLDivElement
    waveSurfer?: WaveSurfer
    loadedAudioBuffer?: AudioBuffer

    loadAudioBuffer() {
        window.setTimeout(() => {
            this.waveSurfer.loadDecodedBuffer(this.props.audioBuffer)
            this.waveSurfer.enableDragSelection({})
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
            backgroundColor: "black",
            audioContext: this.props.context,
            plugins: [
                RegionsPlugin.create({
                })
            ]
        })

        this.waveSurfer.on("seek", (pos: number) => {
            if (this.props.onSeek) {
                this.props.onSeek(pos)
            }
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