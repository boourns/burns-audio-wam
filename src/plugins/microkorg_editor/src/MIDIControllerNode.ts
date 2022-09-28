import { WamEvent, WamParameterDataMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import loadMIDIControllerProcessor, { MIDIControllerConfig } from './MIDIControllerProcessor';

import "wam-extensions"

export class MIDIControllerNode extends WamNode {
    destroyed = false;
    
    state: WamParameterDataMap
    statePoller: number
    pause: boolean
    config: MIDIControllerConfig

    static async addModules(audioContext: BaseAudioContext, moduleId: string): Promise<void> {
        await super.addModules(audioContext, moduleId)
        const { audioWorklet } = audioContext

        await addFunctionModule(audioWorklet, loadMIDIControllerProcessor, moduleId);
    }

	/**
	 * @param {WebAudioModule} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
		super(module, options);
        this.pause = false

        this._supportedEventTypes = new Set(['wam-automation', 'wam-midi', 'wam-sysex']);

        let channel = 0
        if (window.WAMExtensions && window.WAMExtensions.userSetting) {
            let channelStr = window.WAMExtensions.userSetting.get(this.instanceId, "channel")
            if (channelStr == undefined) {
                channel = 0
            } else {
                channel = parseInt(channelStr)
            }
        }

        this.config = {
            channel: channel,
            midiPassThrough: "all"
        }

        this.updateState = this.updateState.bind(this)
        this.updateState()

        super.port.postMessage({action:"config", config: this.config})
	}

    async getState(): Promise<any> {
        return {
            paramState: await super.getState(),
        }
    }

    async setState(state: any): Promise<void> {
        if (state.paramState) {
            await super.setState(state.paramState)
        }
    }

    updateConfig(config: Partial<MIDIControllerConfig>) {
        this.config = {...this.config, ...config}

        if (window.WAMExtensions && window.WAMExtensions.userSetting) {
            window.WAMExtensions.userSetting.set(this.instanceId, "channel", config.channel)
        }

        super.port.postMessage({action:"config", config: this.config})
    }

    async initPressed() {
        this.pause = true

        let params = await this.getParameterInfo()

        let update: WamParameterDataMap = {}

        for (let id of Object.keys(params)) {
            update[id] = {
                id,
                value: params[id].defaultValue,
                normalized: false
            }
        }

        await this.setParameterValues(update)

        this.pause = false
    }

    async sendEventToProcessor(event: WamEvent) {
        super.port.postMessage({action:"emit", event})
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