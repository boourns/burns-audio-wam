import { WebAudioModule } from '@webaudiomodules/sdk';

import { h, render } from 'preact';
import { PatternDelegate } from 'wam-extensions';
import { getBaseUrl } from '../../shared/getBaseUrl';
import { AudioRecorderNode } from './AudioRecorderNode';

import { AudioRecorderView } from './views/AudioRecorderView';

import styleRoot from "./views/AudioRecorderView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

export default class AudioRecorderModule extends WebAudioModule<AudioRecorderNode> {
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

		div.setAttribute("style", "display: flex; flex-direction: column: width: 100%; height: 100%")

		render(<AudioRecorderView plugin={this} clipId={clipId}></AudioRecorderView>, shadow)

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
