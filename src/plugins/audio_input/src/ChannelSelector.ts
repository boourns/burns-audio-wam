import { string } from "lib0"

export type ChannelSelectionOption = {
    name: string
    channels: number[]
}

export class ChannelSelector {
    node: AudioNode
    context: BaseAudioContext

    constructor(node: AudioNode, context: BaseAudioContext) {
        this.node = node
        this.context = context
    }

    availableOptions(): ChannelSelectionOption[] {
        console.log("numberOfInputs: ", this.node.numberOfInputs)
        console.log("numberOfOutputs: ", this.node.numberOfOutputs)
        console.log("channelCount: ", this.node.channelCount)
        
        return []
    }
}