/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable import/extensions */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

import { WebAudioModule } from '@webaudiomodules/sdk';
import {ParamMgrFactory } from '@webaudiomodules/sdk-parammgr';
import Synth101Node from './Node';
import { h, render } from 'preact';
import { SynthView } from './SynthView';
import { getBaseUrl } from '../../shared/getBaseUrl';

import styleRoot from "./Synth101.scss"

let lfoWaves: OscillatorType[] = ["triangle", "square"]
let ranges = ["32'", "16'", "8'", "4'"]
let pwms = ["LFO", "Manual", "Env"]
let subRanges = ["-10ct", "-20ct pulse", "-20ct sine", "-20ct tri"]
let vcaSources = ["Env", "Gate"]
let portamentoModes = ["Off", "Auto", "On"]

function normalize(v: number, min: number, max: number, int: boolean = false) {
	return Math.max(min, Math.min(max, int ? Math.floor(v) : v))
}

export default class Synth101 extends WebAudioModule<Synth101Node> {
	//@ts-ignore
	_baseURL = getBaseUrl(new URL('.', __webpack_public_path__));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;
	_envelopeGeneratorUrl = `${this._baseURL}/EnvelopeGeneratorProcessor.js`;
	_slewUrl = `${this._baseURL}/SlewProcessor.js`;

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
		await this.audioContext.audioWorklet.addModule(this._envelopeGeneratorUrl)
		await this.audioContext.audioWorklet.addModule(this._slewUrl)

		return super.initialize(state);
	}

	async createAudioNode(initialState: any) {
		const synthNode = new Synth101Node(this.audioContext);

		const paramsConfig = {
            detune: {
                defaultValue: 0,
                minValue: -1,
                maxValue: 1
            },
            lfoRate: {
                defaultValue: 0.2,
                minValue: 0,
                maxValue: 1
            },
            lfoWaveform: {
                defaultValue: 0,
                type: 'choice',
				choices: lfoWaves
            },
            oscMod: {
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
				exponent: 2,
            },
			oscRange: {
                defaultValue: 0,
                type: 'choice',
				choices: ranges,
				discreteStep: 1,
				minValue: 0,
				maxValue: ranges.length
            },
            pulseWidth: {
                defaultValue: 0,
                minValue: 0,
                maxValue: 1
            },
			pwmSource: {
                defaultValue: 0,
                type: 'choice',
				choices: pwms
            },
			subRange: {
                defaultValue: 0,
                type: 'choice',
				choices: subRanges
            },
			mixerSaw: {
                defaultValue: 1,
                minValue: 0,
                maxValue: 1
            },
			mixerPulse: {
                defaultValue: 0,
                minValue: 0,
                maxValue: 1
            },
			mixerSub: {
                defaultValue: 0,
                minValue: 0,
                maxValue: 1
            },			
			mixerNoise: {
                defaultValue: 0,
                minValue: 0,
                maxValue: 1
            },
			filterFreq: {
				defaultValue: 0.2,
                minValue: 0,
                maxValue: 1,
			},
			filterRes: {
				defaultValue: 0.05,
                minValue: 0,
                maxValue: 1
			},
			filterEnv: {
				defaultValue: 0.15,
                minValue: 0,
                maxValue: 1
			},
			filterMod: {
				defaultValue: 0,
                minValue: 0,
                maxValue: 1
			},
			filterKeyboard: {
				defaultValue: 0,
                minValue: 0,
                maxValue: 1
			},
			vcaSource: {
                defaultValue: 0,
                type: 'choice',
				choices: vcaSources
            },
			envAttack: {
				defaultValue: 0,
                minValue: 0,
                maxValue: 1
			},
			envDecay: {
				defaultValue: 0.2,
                minValue: 0,
                maxValue: 1
			},
			envSustain: {
				defaultValue: 0,
                minValue: 0,
                maxValue: 1
			},
			envRelease: {
				defaultValue: 0,
                minValue: 0,
                maxValue: 1
			},
			portamentoMode: {
				defaultValue: 0,
				type: 'choice',
				choices: portamentoModes,
			},
			portamentoTime: {
				defaultValue: 0,
				minValue: 0,
				maxValue: 1
			}
        };
        const internalParamsConfig = {
            detune: synthNode.oscillator.detune,
            lfoRate: {
				onChange: (v: number) => { synthNode.parameters.lfoRate = normalize(v, 0, 1); synthNode.updateFromState() },
				automationRate: 30,
            },
            lfoWaveform: {
				onChange: (v: number) => { let n = normalize(v, 0, lfoWaves.length-1, true); synthNode.parameters.lfoWaveform = n; synthNode.updateFromState() },
				automationRate: 30,
            },
            oscMod: synthNode.lfoOscMod.gain,
			oscRange: {
				onChange: (v: number) => { let n = normalize(v, 0, ranges.length-1, true); synthNode.parameters.oscRange = n; synthNode.updateFromState() },
				automationRate: 30,
            },
            pulseWidth: {
				onChange: (v: number) => { synthNode.parameters.pulseWidth = normalize(v, 0, 1); synthNode.updateFromState() },
				automationRate: 30,
            },
			pwmSource: {
				onChange: (v: number) => { synthNode.parameters.pwmSource = normalize(v, 0, pwms.length-1, true); synthNode.updateFromState() },
				automationRate: 20,
            },
			subRange: {
				onChange: (v: number) => { synthNode.parameters.subRange = normalize(v, 0, subRanges.length-1, true); synthNode.updateFromState() },
				automationRate: 30
            },
			mixerSaw: synthNode.mixerSaw.gain,
			mixerPulse: synthNode.mixerPulse.gain,
			mixerSub: synthNode.mixerSub.gain,
			mixerNoise: synthNode.mixerNoise.gain,
			filterFreq: {
				onChange: (v: number) => { synthNode.parameters.filterFreq = normalize(v, 0, 1); synthNode.updateFromState() },
				automationRate: 30,
			},
			filterRes1: synthNode.filters[0].Q,
			filterRes2: synthNode.filters[1].Q,
			filterRes3: synthNode.filters[2].Q,
			filterEnv: synthNode.envFilter.gain,
			filterMod: synthNode.lfoFilter.gain,
			filterKeyboard: {
				onChange: (v: number) => { synthNode.parameters.filterKeyboard = normalize(v, 0, 1); }
			},
			vcaSource: {
				onChange: (v: number) => { synthNode.parameters.vcaSource = normalize(v, 0, vcaSources.length-1, true); synthNode.updateFromState() }
            },
			envAttack: synthNode.env.parameters.get("attackTime"),
			envDecay: synthNode.env.parameters.get("decayTime"),
			envSustain: synthNode.env.parameters.get("sustain"),
			envRelease: synthNode.env.parameters.get("releaseTime"),
			portamentoMode: {
				onChange: (v: number) => { synthNode.parameters.portamentoMode = normalize(v, 0, portamentoModes.length-1, true); }
			},
			portamentoTime: {
				onChange: (v: number) => { synthNode.parameters.portamentoTime = normalize(v, 0, 1); }
			}
        };

		const paramsMapping = {
			detune: {
				detune: {
					sourceRange: [-1, 1],
					targetRange: [-100, 100]
				}
			},
			filterRes: {
				filterRes1: {
					sourceRange: [0, 1],
					targetRange: [0, 8]
				},
				filterRes2: {
					sourceRange: [0, 1],
					targetRange: [0, 8]
				},
				filterRes3: {
					sourceRange: [0, 1],
					targetRange: [0, 8]
				}
			},
			filterMod: {
				filterMod: {
					sourceRange: [0, 1],
					targetRange: [0, 2400]
				}
			},
			filterEnv: {
				filterEnv: {
					sourceRange: [0, 1],
					targetRange: [0, 2400]
				}
			},
			oscMod: {
				oscMod: {
					sourceRange: [0, 1],
					targetRange: [0, 200]
				}
			}
		};

        const optionsIn = { internalParamsConfig, paramsConfig, paramsMapping};
		//  @ts-ignore
		const paramMgrNode = await ParamMgrFactory.create(this, optionsIn);
		synthNode.setup(paramMgrNode);

		if (initialState) synthNode.setState(initialState);
		return synthNode;
    }

	async createGui() {
		const div = document.createElement('div');
		// hack because h() is getting stripped for non-use despite it being what the JSX compiles to
		h("div", {})

		div.setAttribute("style", "display: flex; height: 100%; width: 100%; flex: 1;")

		var shadow = div.attachShadow({mode: 'open'});
		// @ts-ignore
		styleRoot.use({ target: shadow });

		let initialState = this.audioNode.paramMgr.getParamsValues()

		render(<SynthView initialState={initialState} plugin={this}></SynthView>, shadow);

		return div;
	}

	destroyGui(el: Element) {
		//@ts-ignore
		styleRoot.unuse()

		render(null, el.shadowRoot)
	}
}
