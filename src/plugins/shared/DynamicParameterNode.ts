import { WamParameterConfiguration, WamParameterDataMap, WamParameterInfo, WamParameterInfoMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import loadDynamicParameterProcessor from "./DynamicParameterProcessor"

export type DynamicParamEntry = {
    id: string
    config: WamParameterConfiguration
}

export type DynamicParamGroup = {
    name: string
    params: DynamicParamEntry[]
}

export class DynamicParameterNode extends WamNode {
    destroyed = false;
    groupedParameters: DynamicParamGroup[]
    
    state: WamParameterDataMap
    statePoller: number
    schemaUpdateCallback?: () => void
    pause: boolean
    lastSetState?: any

    static async addModules(audioContext: BaseAudioContext, moduleId: string): Promise<void> {
        await super.addModules(audioContext, moduleId)
        const { audioWorklet } = audioContext

        await addFunctionModule(audioWorklet, loadDynamicParameterProcessor, moduleId);
    }

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	constructor(module: WebAudioModule, options: AudioWorkletNodeOptions, groups: DynamicParamGroup[]) {
		super(module, options);
        this.pause = false

        this.updateProcessor(groups);

        this.updateState = this.updateState.bind(this)
        this.updateState()
	}

    async getState(): Promise<any> {
        return {
            paramState: await super.getState()
        }
    }

    async setState(state: any): Promise<void> {
        if (!state.paramState) {
            return
        }
        this.lastSetState = state.paramState
        await super.setState(state.paramState)
    }

    updateProcessor(groups: DynamicParamGroup[]) {
        this.groupedParameters = groups

        let params: Record<string, WamParameterConfiguration> = {}
        let state: WamParameterDataMap = {}

        for (let g of groups) {
            for (let p of g.params) {
                params[p.id] = p.config
                state[p.id] = {id: p.id, value: p.config.defaultValue ?? 0, normalized: false}
            }
        }

        this.state = state

        super.port.postMessage({source:"dpp", parameters: params})

        if (this.lastSetState) {
            super.setState(this.lastSetState)
        }

        if (this.schemaUpdateCallback) {
            this.schemaUpdateCallback()
        }
    }

    async updateState() {
        if (!this.pause) {
            this.state = await this.getParameterValues(false)
        } 

        if (!this.destroyed) {
            this.statePoller = window.requestAnimationFrame(this.updateState)
        }
    }

}