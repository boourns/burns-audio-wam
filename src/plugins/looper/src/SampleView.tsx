import { Component, h } from "preact";
import { WaveformEditorView, WaveformViewTransportControls } from "./WaveformEditorView";
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
    transport?: WaveformViewTransportControls

    updateTransport(transport?: WaveformViewTransportControls) {
        this.transport = transport
    }

    async saveSample() {
        let blob = this.props.sample.sample.saveWav(32)
        if (window.WAMExtensions && window.WAMExtensions.assets) {
            let savedAsset = await window.WAMExtensions.assets.saveAsset("", "AUDIO", blob)
            if (!!savedAsset) {
                this.props.sample.name = savedAsset.name
                this.props.sample.assetUrl = savedAsset.uri
            }
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

    toggleSampleEnabled() {
        
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
        this.props.sample.height = height

        this.forceUpdate()
    }

    resizeFinished() {
    }

    render() {
        if (this.props.sample.state == "LOADED") {
            return this.renderLoadedSample()
        } else if (this.props.sample.state == "ERROR") {
            return <div>Error loading sample: {this.props.sample.error.message}</div>
        } else {
            return <div>{this.props.sample.state}</div>
        }
    }

    renderClipSettings() {
        return <div style="width: 200px; display: flex; flex-direction: column; background-color: gray;">
            <div style="display: flex; flex-direction: row; align-items: first baseline;">
                <button style="font-weight: bolder; margin: 2px; padding: 2px;" onClick={() => this.toggleSampleEnabled()}>{this.props.sample.clipSettings.clipEnabled ? "◼︎" : "◻︎"}</button>
                <span style="flex: 1;">{this.props.sample.name}</span>
                <button style="font-weight: bolder; margin: 2px; padding: 2px;" onClick={() => this.deleteSample()}>Ⅹ</button>
            </div>
            <button onClick={() => this.saveSample()}>Save</button>
        </div>
        
    }

    renderLoadedSample() {
        let oldButtons = <div style="display: flex; flex-direction: row; height: 30px;">
            <div>{this.props.sample.name}</div>
            <button onClick={() => this.transport?.play()}>Play</button>
            <button onClick={() => this.trimLeft()}>Trim left</button>
            <button onClick={() => this.trimRight()}>Trim right</button>

            <button onClick={() => this.zoomIn()}>Zoom In</button>
            <button onClick={() => this.zoomOut()}>Zoom Out</button>
        </div>

        return <div style={`border: 2px; height: ${this.props.sample.height}px; display: flex; flex-direction: column;`}>
            <div style="display: flex; flex-direction: row;">
                {this.renderClipSettings()}
                <div style="flex: 1;">
                    <WaveformEditorView transport={(t) => this.updateTransport(t)} regionActions={[]} context={this.props.context} audioBuffer={this.props.sample.sample.buffer} onSeek={(pos) => this.onSeek(pos)} height={this.props.sample.height-30} zoom={100 * this.props.sample.zoom}></WaveformEditorView>
                </div>
            </div>
             <Resizer vertical={true} resize={(w, h) => this.resize(w, h)} finished={() => this.resizeFinished()}></Resizer>
        </div>
    }
}