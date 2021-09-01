export class AudioPool {
	audioContext: BaseAudioContext

	constructor(audioContext: BaseAudioContext) {
		this.audioContext = audioContext
	}

	loadSample(url: string, callback: Function) {
		var request = new XMLHttpRequest();
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';

		// Decode asynchronously
		request.onload = () => {
			this.audioContext.decodeAudioData(request.response, (buffer) => {
				callback(buffer);
			});
		}
		request.send();
	}
}
