interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>
    ): boolean;
  }
  
  declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
  };
  
  declare function registerProcessor(
    name: string,
    processorCtor: (new (
      options?: AudioWorkletNodeOptions
    ) => AudioWorkletProcessor) & {
      parameterDescriptors?: AudioParamDescriptor[];
    }
  ): undefined;
  
class SlewProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors () {
        return [
            {
                name: 'riseSpeed',
                defaultValue: 1.0,
                minValue: 0.0001,
                maxValue: 1,
                automationRate: 'k-rate'
            },
            {
                name: 'fallSpeed',
                defaultValue: 1.0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'k-rate'
            },
            {
                name: 'input',
                defaultValue: 0.0,
                minValue: -1,
                maxValue: 1,
                automationRate: 'a-rate'
            },
            {
                name: 'gain',
                defaultValue: 1.0,
                minValue: -1,
                maxValue: 1,
                automationRate: 'a-rate'
            },
        ]
    }

    currentValue = 0

    process (inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
        const output = outputs[0][0]
        const input = (inputs != undefined && inputs.length > 0 && inputs[0].length > 0) ? inputs[0][0] : parameters.input

        const riseSpeed = parameters.riseSpeed[0]
        const fallSpeed = parameters.fallSpeed[0]

        for (let i = 0; i < output.length; i++) {
            let inputValue = (input.length == 1) ? input[0] : input[i]
            let gain = (parameters.gain.length == 1) ? parameters.gain[0] : parameters.gain[i]

            if (this.currentValue > inputValue) {
                this.currentValue += (inputValue - this.currentValue) * riseSpeed
            } else if (this.currentValue < inputValue) {
                this.currentValue += (inputValue - this.currentValue) * fallSpeed
            }

            output[i] = this.currentValue * gain
        }

        return true
    }
}

try {
  // @ts-ignore
  registerProcessor('slew-processor', SlewProcessor)
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
