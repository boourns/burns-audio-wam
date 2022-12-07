import { FunctionKernel } from "./FunctionKernel"
import { FunctionSequencerProcessor } from "./FunctionSeqProcessor"

export let processor: FunctionSequencerProcessor
export let kernel: FunctionKernel

export function setProcessor(p: FunctionSequencerProcessor) {
    processor = p
}

export function setKernel(k: FunctionKernel) {
    kernel = k
}
