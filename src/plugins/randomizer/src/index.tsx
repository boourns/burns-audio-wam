import { WamEvent, WamEventMap, WamParameterInfo, WamParameterInfoMap } from '@webaudiomodules/api';
import { addFunctionModule, WebAudioModule } from '@webaudiomodules/sdk';
import 'wam-extensions'
import { h, render } from 'preact';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { RandomizerView } from './RandomizerView';
import { DynamicParameterNode } from '../../shared/DynamicParameterNode';

import styleRoot from "./RandomizerView.scss"
import loadRandomizerProcessor from './RandomizerProcessor';

var logger = console.log

export class RandomizerNode extends DynamicParameterNode {
	destroyed = false;
	_supportedEventTypes: Set<keyof WamEventMap>

	paramList?: WamParameterInfoMap
	targetParam?: string
	callback?: () => void

	connected: boolean

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

		// 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-transport']);
	}

	async randomize() {
		let events: WamEvent[] = []

		if (!this.paramList) {
			return
		}

		for (let id of Object.keys(this.paramList)) {
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

		console.log("Posting from node ", events)
		
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

		if (this.nonce) {
			// we've already rendered before, unuse the styles before using them again
			this.nonce = undefined

			//@ts-ignore
			styleRoot.unuse()
		}

		this.nonce = Math.random().toString(16).substr(2, 8);
		div.setAttribute("data-nonce", this.nonce)

		// @ts-ignore
		styleRoot.use({ target: shadow });

		render(<RandomizerView plugin={this.audioNode} ></RandomizerView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		if (el.getAttribute("data-nonce") == this.nonce) {
			// this was the last time we rendered the GUI so clear the style
			
			//@ts-ignore
			styleRoot.unuse()
		}
		
		render(null, el)
	}

}