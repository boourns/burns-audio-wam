/* eslint-disable no-underscore-dangle */
import "wam-extensions"

import { WamEventMap, WamParameterInfoMap, WebAudioModule } from '@webaudiomodules/api';
import { addFunctionModule, WamNode } from '@webaudiomodules/sdk';
import getEnvelopeFollowerProcessor from './EnvelopeFollowerProcessor';

export class EnvelopeFollowerNode extends WamNode {
	destroyed = false;
	extensionMissing = false;

	renderCallback?: () => void
	_supportedEventTypes: Set<keyof WamEventMap>

	static async addModules(audioContext: BaseAudioContext, moduleId: string) {
		const { audioWorklet } = audioContext;

		await super.addModules(audioContext, moduleId);

		await addFunctionModule(audioWorklet, getEnvelopeFollowerProcessor, moduleId);
	}

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, {...options, processorOptions: {
			numberOfInputs: 1,
			numberOfOutputs: 0,
			outputChannelCount: [2],
			useSab: true
		}});

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}

	paramList?: WamParameterInfoMap
	targetParam?: string

	async getState(): Promise<any> {
		var params = await super.getState()
		return {
			params, 
			targetParam: this.targetParam
		}
	}

	async setState(state: any) {
		if (state.params) {
			await super.setState(state.params)
		}

		if (state.targetParam != this.targetParam) {
			this.setTargetParameter(state.targetParam)
		}
	}

	async setTargetParameter(id: string | undefined) {
		this.targetParam = id

		if (!this.paramList) {
			console.log("param list not yet set")
			return
		}

		// paramList is set 
		const param = id ? this.paramList[id] : undefined
		this.port.postMessage({action: "target", param})

		let ids = id ? [id] : []

		await window.WAMExtensions.modulationTarget.lockParametersForAutomation(this.instanceId, ids)
	}


}
