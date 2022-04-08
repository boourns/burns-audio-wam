import { Component, h } from 'preact';
import { VUMeter } from './VUMeter';

export interface StereoVUMeterProps {
    node: AudioNode
    width: number
    height: number
}

type StereoVUMeterState = {
}

export class StereoVUMeter extends Component<StereoVUMeterProps, StereoVUMeterState> {
    static defaultProps = {
        width: 15,
        height: 120,
    }

    node!: ChannelSplitterNode

    componentWillMount() {
        this.node = this.props.node.context.createChannelSplitter(this.props.node.channelCount)
        this.props.node.connect(this.node)
    }

    render() {
        h("div", {})

        let width = this.props.width / 2

        var index = 1
        if (this.props.node.channelCount == 1) {
            index = 0
        }

        return <div style="display: flex; flex-direction: row;">
            <div style="padding-right: 1px;">
                <VUMeter height={this.props.height} width={width} node={this.node} channelIndex={0}/>
            </div>
            <VUMeter height={this.props.height} width={width} node={this.node} channelIndex={index} />
        </div>
    }
}