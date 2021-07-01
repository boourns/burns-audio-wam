/** @typedef {import('./api/types').WamProcessor} IWamProcessor */
/** @typedef {import('./api/types').WamEnv} IWamEnv */
/** @typedef {import('./api/types').AudioWorkletGlobalScope} AudioWorkletGlobalScope */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
/* eslint-disable max-len */

const processor = () => {
	/**
	 * @implements {IWamEnv}
	 */
	class WamEnv {
		constructor() {
			this._transportEvents = [
				{
					playing: false,
					beatsPerBar: 4,
					initialBarPosition: 0,
					start: {
						timestamp: 0,
						bpm: 120
					}
				}
			]
		
			/** @type {Map<IWamProcessor, Set<IWamProcessor>[]>} */
			this._eventGraph = new Map();
			/** @type {Record<string, IWamProcessor>} */
			this._processors = {};
		}

		get eventGraph() {
			return this._eventGraph;
		}

		get processors() {
			return this._processors;
		}

		/**
		 * @param {IWamProcessor} wam
		 */
		create(wam) {
			this._processors[wam.instanceId] = wam;
			// console.log('create', this);
		}

		/**
		 * @param {IWamProcessor} from
		 * @param {IWamProcessor} to
		 * @param {number} [output]
		 */
		connectEvents(from, to, output = 0) {
			/** @type {Set<IWamProcessor>[]} */
			let outputMap;
			if (this._eventGraph.has(from)) {
				outputMap = this._eventGraph.get(from);
			} else {
				outputMap = [];
				this._eventGraph.set(from, outputMap);
			}
			if (outputMap[output]) {
				outputMap[output].add(to);
			} else {
				const set = new Set();
				set.add(to);
				outputMap[output] = set;
			}
			// console.log('connectEvents', this);
		}

		/**
		 * @param {IWamProcessor} from
		 * @param {IWamProcessor} [to]
		 * @param {number} [output]
		 */
		disconnectEvents(from, to, output) {
			if (!this._eventGraph.has(from)) return;
			const outputMap = this._eventGraph.get(from);
			if (typeof to === 'undefined') {
				outputMap.forEach((set) => {
					if (set) set.clear();
				});
				return;
			}
			if (typeof output === 'undefined') {
				outputMap.forEach((set) => {
					if (set) set.delete(to);
				});
				return;
			}
			if (!outputMap[output]) return;
			outputMap[output].delete(to);
			// console.log('disconnectEvents', this);
		}

		/**
		 * @param {IWamProcessor} wam
		 */
		destroy(wam) {
			if (this.eventGraph.has(wam)) this.eventGraph.delete(wam);
			this.eventGraph.forEach((outputMap) => {
				outputMap.forEach((set) => {
					if (set && set.has(wam)) set.delete(wam);
				});
			});
			// console.log('destroy', this);
		}

		/**
		 * @param {boolean} playing
		 * @param {number} bpm
		 * @param {number} beatsPerBar
		 * @param {number} [initialBarPosition]
		 * @param {number} [timestamp]
		 */
		setTransportAtTime(playing, bpm, beatsPerBar, initialBarPosition, timestamp) {
			if (timestamp === undefined) {
				timestamp = currentTime
			}

			if (initialBarPosition === undefined) {
				initialBarPosition = this.getBarPosition(timestamp)
			}

			this._transportEvents.push({
				playing,
				initialBarPosition,
    			beatsPerBar,
				start: {
					timestamp,
					bpm
				}
			})

			// 
			this._transportEvents = this._transportEvents.sort((a, b) => a.start.timestamp - b.start.timestamp)

			// remove all but the most recent transport event that occurred in the past
			while (this._transportEvents.length > 0 && this._transportEvents[0].start.timestamp <= currentTime) {
				var transport = this._transportEvents.shift()
			}

			this._transportEvents.unshift(transport)
		}
		
		/**
		 * 
		 * @param {number} startBpm 
		 * @param {number} startTime 
		 * @param {number} endBpm 
		 * @param {number} endTime 
		 * @param {number} beatsPerBar
		 * @param {number} [initialBarPosition]
		 */
		automateTempo(startBpm, startTime, endBpm, endTime, beatsPerBar, initialBarPosition) {
			if (initialBarPosition === undefined) {
				initialBarPosition = this.getBarPosition(startTime)
			}

			this._transportEvents.push({
				playing: true,
				initialBarPosition,
				beatsPerBar,
				start: {
					timestamp: startTime,
					bpm: startBpm
				},
				end: {
					timestamp: endTime,
					bpm: endBpm
				}
			})

			this._transportEvents = this._transportEvents.sort((a, b) => a.start.timestamp - b.start.timestamp)
		}
		
		/**
		 * @param {number} from
		 * @param {number} to
		 */
		// eslint-disable-next-line
		getTransportEvents(from, to) { 
			var result = []
			this._transportEvents.forEach(ev => {
				// at least partial overlap with the requested time frame
				if (ev.start.timestamp <= to && (!ev.end || ev.end.timestamp > from)) {
					// only include the most recent event with a timestamp starting before this time period
					if (ev.start.timestamp <= from && result.length > 0) {
						result[0] = ev
					} else {
						result.push(ev)
					}
				}
			})

			return result
		}

		/**
		 * @param {number} timestamp
		 */
		getBarPosition(timestamp) {
			let transport = this.getTransportEvents(timestamp, timestamp)[0]

			let time = timestamp - transport.start.timestamp

			// based on transport segment, where are we
			if (transport.end) {
				// change of rate of X beats per second squared
				var acceleration = ((transport.end.bpm - transport.start.bpm)/60.0) / (transport.end.timestamp - transport.start.timestamp)
				var beatPosition = (0.5 * acceleration * time * time) + ((transport.start.bpm/60.0) * time) + (transport.initialBarPosition * transport.beatsPerBar)
			} else {
				// we are at a fixed tempo
				var beatPosition = (transport.initialBarPosition * transport.beatsPerBar) + ((transport.start.bpm/60.0) * time)
			}

			return beatPosition / transport.beatsPerBar
		}
		
	}

	/** @type {AudioWorkletGlobalScope} */
	// @ts-ignore
	const audioWorkletGlobalScope = globalThis;
	if (!audioWorkletGlobalScope.webAudioModules) audioWorkletGlobalScope.webAudioModules = new WamEnv();
};

/** @type {AudioWorkletGlobalScope} */
// @ts-ignore
const audioWorkletGlobalScope = globalThis;
if (audioWorkletGlobalScope.AudioWorkletProcessor) {
	if (!audioWorkletGlobalScope.webAudioModules) processor();
}

export default processor;
