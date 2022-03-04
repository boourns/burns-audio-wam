import { Component, h } from "preact";
import { Sample } from "./Sample";
import { WaveformEditorView } from "./WaveformEditorView";

export interface SampleViewProps {
    context: AudioContext
    sample: Sample
}

type SampleViewState = {}

export class SampleView extends Component<SampleViewProps, SampleViewState> {
    render() {
        return <WaveformEditorView regionActions={[]} context={this.props.context} audioBuffer={this.props.sample.buffer}></WaveformEditorView>
    }
}