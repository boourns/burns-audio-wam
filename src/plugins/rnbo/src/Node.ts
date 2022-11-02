/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode, ParamMgrFactory, ParamMgrNode } from '@webaudiomodules/sdk-parammgr';
import { getBaseUrl } from '../../shared/getBaseUrl';

import RNBO, { ParameterType } from "@rnbo/js"

export type MIDIEvent = [number, number, number];

export type ScheduledMIDIEvent = {
    event: MIDIEvent,
    time: number
}

export default class RainbowNode extends CompositeAudioNode {
    _wamNode: ParamMgrNode<string, string> = undefined;
    _input!: AudioNode
    
    //@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));
    _patchExportURL = `${this._baseURL}/patch.export.json`;

    callback?: () => void
    error?: string

    device?: RNBO.BaseDevice

    constructor(audioContext: AudioContext, baseUrl: string, options = {}) {
        super(audioContext, options);
    }

    /*  #########  Personnal code for the web audio graph  #########   */
    async createNodes() {
        let ctx = this.context as AudioContext

        if (!this.device) {
            return
        }

        this._output = this.context.createGain()

         // Connect the device to the web audio graph
        this.device.node.connect(this._output)

        this.attachMidi()

        this.attachOutports()

        this.updateFromState()
    }

    async loadRNBO() {
        // Fetch the exported patcher
        let response, patcher;
        try {
            response = await fetch(this._patchExportURL);
            patcher = await response.json();

        } catch (err) {
            if (response && (response.status >= 300 || response.status < 200)) {
                this.setError(`Couldn't load patcher export bundle`)
            }
        }

        try {
            this.device = await RNBO.createDevice({ context: this.context as AudioContext, patcher });
        } catch (err) {
            this.setError(err)
            return;
        }
    }

    paramMgrConfig() {
        let paramsConfig: Record<string, any> = {}
        let internalParamsConfig: Record<string, any> = {}

        if (!this.device) {
            return {internalParamsConfig: {}, paramsConfig: {}}
        }

        // add params to parammgr
        this.device.parameters.forEach(param => {
            if (param.type == ParameterType.Number) {
                paramsConfig[param.id] = {
                    defaultValue: param.initialValue,
                    minValue: param.min,
                    maxValue: param.max,
                }

                internalParamsConfig[param.id] = {
                    onChange: (v: number) => { 
                        console.log(`Param change: ${param.id}: ${v}`)
                        param.value=v; 
                    },
                    automationRate: 30,
                }
            }

            //// Listen to parameter changes from the device
            // device.parameterChangeEvent.subscribe(param => {
            //     if (!isDraggingSlider)
            //         uiElements[param.name].slider.value = param.value;
            //     uiElements[param.name].text.value = param.value.toFixed(1);
            // });
        })

        return {paramsConfig, internalParamsConfig}
    }

    attachMidi() {
        if (this.device.numMIDIInputPorts === 0) {
            return
        }

        this._wamNode.addEventListener('wam-midi', (e) => this.processMIDIEvents([{event: e.detail.data.bytes, time: 0}]));
    }

    processMIDIEvents(midiEvents: ScheduledMIDIEvent[]) {
        for (let e of midiEvents) {
            this.device.scheduleEvent(new RNBO.MIDIEvent(e.time * 1000, 0, e.event));
        }
    }

    setError(error: string) {
        this.error = error
        if (this.callback) {
            this.callback()
        }
    }

    updateFromState() {        
        if (this.callback) {
            this.callback()
        }
    }

    attachOutports() {
        if (!this.device) {
            return
        }

        const outports = this.device.messages.filter(message => message.type === RNBO.MessagePortType.Outport);
    
        this.device.messageEvent.subscribe((ev) => {
            // Message events have a tag as well as a payload
            console.log(`${ev.tag}: ${ev.payload}`);
        });
    }

    get paramMgr(): ParamMgrNode {
        return this._wamNode;
    }

    // /**
    //  * @param {ParamMgrNode<Params, InternalParams>} wamNode
    //  */
    setup(paramMgr: ParamMgrNode) {
        this._wamNode = paramMgr

        this.createNodes()
    }
}
