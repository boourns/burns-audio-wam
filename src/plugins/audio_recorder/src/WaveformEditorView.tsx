import { Component, h } from "preact";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';
import { WaveSurferParams } from "wavesurfer.js/types/params";

import styleRoot from "./WaveformEditorView.scss";

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export type RegionAction = {
    label: string
    action: () => {}
}

export interface WaveformViewProps {
    context: AudioContext
    audioBuffer: AudioBuffer
    height: number
    regionActions: RegionAction[]
    onSeek?: (pos: number) => void
    zoom: number
}

type WaveformViewState = {}

export class WaveformEditorView extends Component<WaveformViewProps, WaveformViewState> {
    container?: HTMLDivElement
    waveSurfer?: WaveSurfer
    loadedAudioBuffer?: AudioBuffer
    scrollPos?: number

    apply() {
        console.log("Zooming to ", this.props.zoom)

        if (this.props.zoom > 10000) {
            if (this.props.zoom > this.props.audioBuffer.sampleRate) {
                this.waveSurfer.params.barWidth = Math.floor(this.props.zoom / this.props.audioBuffer.sampleRate)
            } else {
                this.waveSurfer.params.barWidth = 1
            }
        } else {
            this.waveSurfer.params.barWidth = undefined
        }

        this.waveSurfer.zoom(this.props.zoom)

        this.waveSurfer.setHeight(this.props.height)
    }

    loadAudioBuffer() {
        window.setTimeout(() => {
            this.waveSurfer.loadDecodedBuffer(this.props.audioBuffer)
            this.waveSurfer.enableDragSelection({})
            this.apply()
        }, 1)

        this.loadedAudioBuffer = this.props.audioBuffer
    }

    componentWillUnmount(): void {
        if (this.waveSurfer) {
            this.waveSurfer.destroy()
            this.waveSurfer = undefined
        }        
    }

    createWaveSurfer() {
        if (this.waveSurfer) {
            this.waveSurfer.destroy()
            this.waveSurfer = undefined
            this.loadAudioBuffer = undefined
        }

        let options: WaveSurferParams = {
            container: this.container,
            responsive: true,
            height: this.props.height / this.props.audioBuffer.numberOfChannels,
            backgroundColor: "black",
            audioContext: this.props.context,
            splitChannels: true,
            scrollParent: true,
            forceDecode: true,
            plugins: [
                RegionsPlugin.create({
                })
            ]
        }

        if (this.props.zoom > 10000) {
            options.barWidth = 5
        }

        this.waveSurfer = WaveSurfer.create(options)

        this.waveSurfer.on("seek", (pos: number) => {
            if (this.props.onSeek) {
                this.props.onSeek(pos)
            }
        })

        this.waveSurfer.on("scroll", (ev: any) => {
            console.log("SCROLLED! are we at ", ev.target.scrollLeft / ev.target.scrollLeftMax)
            console.log(ev)
        })


        this.loadAudioBuffer()

    }

    setup(el: HTMLDivElement | null) {
        if (!el) {
            return
        }
        if (this.container == el) {
            return
        }
        this.container = el

        this.createWaveSurfer()
    }

    render() {
        let justLoaded = false
        if (this.waveSurfer && (!this.loadedAudioBuffer || this.loadedAudioBuffer != this.props.audioBuffer)) {            
            this.loadAudioBuffer()
            justLoaded = true
        }

        let height = this.props.height * this.props.audioBuffer.numberOfChannels
        if (this.waveSurfer && !justLoaded) {
            this.apply()
        }

        return <div style={`background-color: black; height: ${height}px`} ref={(el) => {this.setup(el)}} ></div>   
    }
}