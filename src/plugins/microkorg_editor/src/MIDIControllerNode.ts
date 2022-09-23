import { WamParameterDataMap } from '@webaudiomodules/api';
import { WebAudioModule, WamNode, addFunctionModule } from '@webaudiomodules/sdk';
import loadMIDIControllerProcessor from './MIDIControllerProcessor';

export class MIDIControllerNode extends WamNode {
    destroyed = false;
    
    state: WamParameterDataMap
    statePoller: number
    pause: boolean
    lastSetState?: any

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

    async initPressed() {
        this.pause = true

        let params = await this.getParameterInfo()
        console.log("received params ", params)

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

    async updateState() {
        if (!this.pause) {
            this.state = await this.getParameterValues(false)
        } 

        if (!this.destroyed) {
            this.statePoller = window.requestAnimationFrame(this.updateState)
        }
    }

}