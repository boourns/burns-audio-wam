import { Component, h } from "preact";
import { WaveformEditorView } from "./WaveformEditorView";
import { SampleEditor, SampleState } from "./SampleEditor";
import { Sample } from "./Sample";
import { Resizer } from "./Resizer";

export interface SampleViewProps {
    index: number
    editor: SampleEditor
    context: AudioContext
    sample: SampleState
}

type SampleViewState = {}

export class SampleView extends Component<SampleViewProps, SampleViewState> {
    saveSample() {
        let blob = this.props.sample.sample.saveWav(32)
        if (window.WAMExtensions && window.WAMExtensions.assets) {
            window.WAMExtensions.assets.saveAsset("", "AUDIO", blob)
        } else {
            var blobUrl = URL.createObjectURL(blob);
            window.location.replace(blobUrl)
        }
    }

    deleteSample() {
        let state = this.props.editor.getState()
        let arr = state.samples.filter((v, i) => i != this.props.index)
        state.samples = arr
        this.props.editor.setState(state)
    }

    splitSamples() {
        let split = this.props.sample.sample.splitChannels()
        let state = this.props.editor.getState()

        let add = split.map((s, i) => this.props.editor.defaultSampleState(s, `${this.props.sample.name} - Ch #${i+1}`))
        console.log(add)

        state.samples = state.samples.concat(add)
        this.props.editor.setState(state)
    }

    trimLeft() {
        if (!this.props.sample.seekPos) {
            return
        }

        let trimmed = this.props.sample.sample.trimLeft(this.props.sample.seekPos)
        this.replaceSample(trimmed)
    }

    trimRight() {
        if (!this.props.sample.seekPos) {
            return
        }

        let trimmed = this.props.sample.sample.trimRight(this.props.sample.seekPos)
        this.replaceSample(trimmed)
    }

    replaceSample(sample: Sample) {
        let state = this.props.editor.getState()
        state.samples[this.props.index] = {...this.props.sample, sample}
        this.props.editor.setState(state)
    }

    onSeek(pos: number) {
        console.log("Seeked to ", pos)
        this.props.sample.seekPos = pos
    }

    zoomIn() {
        this.props.sample.zoom = this.props.sample.zoom * 2
        this.forceUpdate()
    }

    zoomOut() {
        this.props.sample.zoom = this.props.sample.zoom * 0.5
        this.forceUpdate()
    }

    resize(width: number, height: number) {
        console.log("Resizeing to ", height)
        this.props.sample.height = height

        this.forceUpdate()
    }

    resizeFinished() {

    }

    render() {
        return <div style={`border: 2px; height: ${this.props.sample.height}px; display: flex; flex-direction: column;`}>
            <div style="display: flex; flex-direction: row; height: 30px;">
                <div>{this.props.sample.name}</div>
                <button onClick={() => this.saveSample()}>Save</button>
                <button onClick={() => this.deleteSample()}>Delete</button>
                <button onClick={() => this.splitSamples()}>Split Channels</button>
                <button onClick={() => this.trimLeft()}>Trim left</button>
                <button onClick={() => this.trimRight()}>Trim right</button>

                <button onClick={() => this.zoomIn()}>Zoom In</button>
                <button onClick={() => this.zoomOut()}>Zoom Out</button>

            </div>
            <WaveformEditorView regionActions={[]} context={this.props.context} audioBuffer={this.props.sample.sample.buffer} onSeek={(pos) => this.onSeek(pos)} height={this.props.sample.height-30} zoom={100 * this.props.sample.zoom}></WaveformEditorView>

            <Resizer vertical={true} resize={(w, h) => this.resize(w, h)} finished={() => this.resizeFinished()}></Resizer>
        </div>
    }
}