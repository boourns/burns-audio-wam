import { Component, h } from "preact";
import { Sample } from "./Sample";
import { WaveformEditorView } from "./WaveformEditorView";
import wavefile, {WaveFile} from "wavefile"

import { WamAsset } from 'wam-extensions';


export interface SampleViewProps {
    context: AudioContext
    sample: Sample
}

type SampleViewState = {}

export class SampleView extends Component<SampleViewProps, SampleViewState> {
    saveSample() {
        console.log("saveSample()")

        let blob = this.props.sample.saveWav(32)
        if (window.WAMExtensions && window.WAMExtensions.assets) {
            window.WAMExtensions.assets.saveAsset("", "AUDIO", blob)
        } else {
            var blobUrl = URL.createObjectURL(blob);
            window.location.replace(blobUrl)
        }
    }

    onSeek(pos: number) {
        console.log("Seeked to ", pos)
    }

    render() {
        return <div>
            <div>
                <button onClick={() => this.saveSample()}>Save</button>
            </div>
            <WaveformEditorView regionActions={[]} context={this.props.context} audioBuffer={this.props.sample.buffer} onSeek={(pos) => this.onSeek(pos)}></WaveformEditorView>
        </div>
    }
}