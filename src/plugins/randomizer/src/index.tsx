import { WamEvent, WamEventMap, WamParameterInfo, WamParameterInfoMap } from '@webaudiomodules/api';
import { addFunctionModule, WebAudioModule } from '@webaudiomodules/sdk';
import 'wam-extensions'
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { RandomizerView } from './RandomizerView';
import { DynamicParameterNode } from '../../shared/DynamicParameterNode';

import styles from "./RandomizerView.scss"
import { insertStyle} from "../../shared/insertStyle"

import loadRandomizerProcessor from './RandomizerProcessor';

var logger = console.log

export enum RandomizerRuleType {
	doNotRandomize = 0
}

export type RandomizerRule = {
	target: string
	rule: RandomizerRuleType
}

export class RandomizerNode extends DynamicParameterNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	paramList?: WamParameterInfoMap
	targetParam?: string
	callback?: () => void

	connected: boolean
	rules: RandomizerRule[]

	static async addModules(audioContext: BaseAudioContext, moduleId: string): Promise<void> {
		await super.addModules(audioContext, moduleId)
        const { audioWorklet } = audioContext

		await addFunctionModule(audioWorklet, loadRandomizerProcessor, moduleId);
	}

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	 constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, {...options, processorOptions: {
			numberOfInputs: 1,
			numberOfOutputs: 1,
			outputChannelCount: [2],
		}}, []);

		this.rules = []

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	async getState(): Promise<any> {
		return {
			rules: this.rules
		}
	}

	async setState(state: any): Promise<void> {
		if (state.rules) {
			this.rules = state.rules
		} else {
			this.rules = []
		}

		if (this.callback) {
			this.callback()
		}
	}

	deleteRule(index: number) {
		this.rules = this.rules.filter((v, i) => i != index)

		if (this.callback) {
			this.callback()
		}
	}

	async randomize() {
		let events: WamEvent[] = []

		if (!this.paramList) {
			return
		}

		for (let id of Object.keys(this.paramList)) {
			const rules = this.rules.filter(r => r.target == id)

			if (rules.some(v => v.rule == RandomizerRuleType.doNotRandomize)) {
				continue
			}

			let param = this.paramList[id]
			let value = param.minValue + (Math.random() * (param.maxValue - param.minValue))
			if (param.type != "float") {
				value = Math.round(value)
			}

			events.push({
				type: "wam-automation",
				data: {
					id: id,
					normalized: false,
					value
				},
			})
		}
		
		super.port.postMessage({
			source: "emit",
			events
		})
	}
}

export default class RandomizerModule extends WebAudioModule<RandomizerNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	nonce: string | undefined;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);
		return descriptor
	}

	sequencerNode: RandomizerNode
	targetParam?: WamParameterInfo

	async initialize(state: any) {
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await RandomizerNode.addModules(this.audioContext, this.moduleId)
		
		const node: RandomizerNode = new RandomizerNode(this, {});
		await node._initialize();

		if (initialState) node.setState(initialState);

		if (window.WAMExtensions && window.WAMExtensions.modulationTarget) {
			window.WAMExtensions.modulationTarget.setModulationTargetDelegate(this.instanceId, {
				connectModulation: async (params: WamParameterInfoMap) => {
					node.paramList = params
					if (node.callback) {
						node.callback()
					}
				}
			})
		} else {
			console.error("did not find modulationTarget extension ", window.WAMExtensions)
		}
		
		return node
    }

	async createGui(clipId?: string) {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "height: 100%; width: 100%; display: flex; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		insertStyle(shadow, styles.toString())

		render(<RandomizerView plugin={this.audioNode} ></RandomizerView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}

}
