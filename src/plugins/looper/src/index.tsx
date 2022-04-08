import { WebAudioModule } from '@webaudiomodules/sdk';
import { id } from 'lib0/function';

import { h, render } from 'preact';
import { PatternDelegate } from 'wam-extensions';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { AudioRecorderNode } from './AudioRecorderNode';

import { AudioRecorderView } from './AudioRecorderView';


export default class AudioRecorderModule extends WebAudioModule<AudioRecorderNode> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	async _loadDescriptor() {		
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this._descriptor, descriptor);

		return descriptor
	}

	async initialize(state: any) {
		await this._loadDescriptor();

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		await AudioRecorderNode.addModules(this.audioContext, this.moduleId)

		const node: AudioRecorderNode = new AudioRecorderNode(this, {});
		await node._initialize()

		if (initialState) node.setState(initialState);

		this.updateExtensions()

		return node
    }

	async createGui(clipId?: string) {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})
		div.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")

		//var shadow = div.attachShadow({mode: 'open'});
		//const container = document.createElement('div');
		//container.setAttribute("style", "display: flex; flex-direction: column; height: 100%; width: 100%; max-height: 100%; max-width: 100%;")
		
		//shadow.appendChild(container)

		//render(<ChorderView plugin={this}></ChorderView>, div);
		render(<AudioRecorderView plugin={this} clipId={clipId}></AudioRecorderView>, div)
		return div;
	}

	destroyGui(el: Element) {
		render(null, el)
	}

	updateExtensions() {
		if (!(window.WAMExtensions && window.WAMExtensions.patterns && window.WAMExtensions.recording)) {
			return
		}

		let patternDelegate: PatternDelegate = {
			getPatternList: () => {
				let clipMap: Record<string, string> = {}

				for (let sample of this.audioNode.editor.samples) {
					clipMap[sample.clipId] = sample.name
				}

				return Object.keys(clipMap).map(c => { return {id: c, name: clipMap[c]}})
			},
			createPattern: (id: string) => {
				
			},
			deletePattern: (id: string) => {
				console.error("TODO: deletePattern for looper ")
			},
			playPattern: (clipId: string | undefined) => {
				this.audioNode.port.postMessage({source:"ar", action: "play", clipId})
			},
			getPatternState: (id: string) => {
				return this.audioNode.editor.samples.filter(s => s.clipId == id && !!s.assetUrl).map(s => s.assetUrl)
			},
			setPatternState: (id: string, state: any) => {
				console.error("TODO: looper setPatternState")
			}
		}

		window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate)

		window.WAMExtensions.recording.register(this.instanceId, {
			armRecording: (armed: boolean) => {
				this.audioNode.setRecording(armed)
			}
		})

	}
}
