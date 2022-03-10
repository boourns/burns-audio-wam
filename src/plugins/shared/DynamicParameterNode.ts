import { WamParameterConfiguration, WamParameterDataMap, WamParameterInfo, WamParameterInfoMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import loadDynamicParameterProcessor from "./DynamicParameterProcessor"

export class DynamicParameterNode extends WamNode {
    destroyed = false;
    wamParameters: Record<string, WamParameterConfiguration>
    
    state: WamParameterDataMap
    statePoller: number

    static async addModules(audioContext: BaseAudioContext, moduleId: string): Promise<void> {
        await super.addModules(audioContext, moduleId)
        const { audioWorklet } = audioContext

        await addFunctionModule(audioWorklet, loadDynamicParameterProcessor, moduleId);
    }

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	constructor(module: WebAudioModule, options: AudioWorkletNodeOptions, parameters: Record<string, WamParameterConfiguration>) {
		super(module, options);

        this.updateProcessor(parameters);

        this.updateState = this.updateState.bind(this)
        
        this.updateState();
	}

    updateProcessor(parameters: Record<string, WamParameterConfiguration>) {
        this.wamParameters = parameters;

        super.port.postMessage({source:"dpp", parameters: this.wamParameters})
    }

    async updateState() {
        this.state = await this.getParameterValues(false)
    
        if (!this.destroyed) {
            this.statePoller = window.requestAnimationFrame(this.updateState)
        }
    }
}