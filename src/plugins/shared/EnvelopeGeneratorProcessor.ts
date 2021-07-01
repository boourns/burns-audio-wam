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


type PendingTriggerEvent = {
  high: boolean,
  samples: number
}

let STATE_IDLE = -1
let STATE_ATTACK = 0
let STATE_DECAY = 1
let STATE_SUSTAIN = 2
let STATE_RELEASE = 3

var logger = 0

class EnvelopeGeneratorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors () {
    return [
      {
        name: 'velocity',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      },
      {
        name: 'attackTime',
        defaultValue: 0.1,
        minValue: 0,
        maxValue: 10,
        automationRate: 'k-rate'
      },
      {
        name: 'decayTime',
        defaultValue: 0.2,
        minValue: 0,
        maxValue: 10,
        automationRate: 'k-rate'
      },
      {
        name: 'sustain',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      },
      {
        name: 'releaseTime',
        defaultValue: 0.2,
        minValue: 0,
        maxValue: 10,
        automationRate: 'k-rate'
      },
    ]
  }

  startValue = 0
  currentValue = 0
  previousValue = 0
  currentState = STATE_IDLE
  stateChanged = false
  targetValue = 0

  segmentPosition = 0
  segmentIncrement = 0

  pendingTriggerEvents: PendingTriggerEvent[] = []

  constructor() {
    super();

    this.port.onmessage = (ev => {
      if (ev.data.event == "trigger") {
        // @ts-ignore
          this.pendingTriggerEvents.push({high: ev.data.high, samples: ev.data.time * sampleRate})
      }
    })
  }

  incrementState() {
    this.stateChanged = true

    switch(this.currentState) {
      case STATE_ATTACK:
        this.currentState = STATE_DECAY
        break
      case STATE_DECAY:
        this.currentState = STATE_SUSTAIN
        break
      case STATE_RELEASE:
        this.currentState = STATE_IDLE
        break
    }
  }

  updateState(parameters: Record<string, Float32Array>) {
    this.stateChanged = false
    var targetTime = 0

    switch(this.currentState) {
      case STATE_IDLE:
        targetTime = 0
        this.targetValue = 0
        break
      case STATE_ATTACK:
        targetTime = 0.001 + parameters.attackTime[0]
        // is this what the SH-101 does?
        this.currentValue = 0
        this.targetValue = parameters.velocity[0]
        break
      case STATE_DECAY:
        targetTime = 0.001 + parameters.decayTime[0]
        this.targetValue = parameters.velocity[0] * parameters.sustain[0]
        break
      case STATE_SUSTAIN:
        targetTime = 0
        this.targetValue = parameters.velocity[0] * parameters.sustain[0]
        break
      case STATE_RELEASE:
        targetTime = 0.001 + parameters.releaseTime[0]
        this.targetValue = 0
        break     
    }

    this.startValue = this.currentValue

    // @ts-ignore
    let totalSegmentSamples = targetTime * sampleRate
    this.segmentPosition = 0

    if (totalSegmentSamples > 0) {
      this.segmentIncrement = 1 / totalSegmentSamples
    } else {
      this.currentValue = this.targetValue
      this.segmentIncrement = 0
    }
  }

  process (inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    var recalculate = true
    var valueIncrement = 0
    let output = outputs[0][0]

    for (let i = 0; i < output.length; i++) {
      // HANDLE TRIGGER
      for (let triggerEvent of this.pendingTriggerEvents) {
        triggerEvent.samples--
        if (triggerEvent.samples <= 0) {
          if ((this.currentState == STATE_IDLE || this.currentState == STATE_RELEASE) && triggerEvent.high) {
            this.stateChanged = true
            this.currentState = STATE_ATTACK
          } else if (this.currentState != STATE_IDLE && this.currentState != STATE_RELEASE && !triggerEvent.high) {
            this.stateChanged = true
            this.currentState = STATE_RELEASE
          }
        }
      }
      this.pendingTriggerEvents = this.pendingTriggerEvents.filter(e => e.samples > 0)

      if (this.stateChanged) {
          this.updateState(parameters)
          recalculate = true
      }
      
      // we are in a segment that changes value
      if (this.segmentIncrement > 0) {
        // DO WE NEED TO CALCULATE OUR NEXT TARGET?
        if (recalculate) {
          recalculate = false
          let remaining = output.length - i
          let finalValue = this.startValue + ((this.targetValue - this.startValue) * Math.pow(this.segmentPosition + (this.segmentIncrement * remaining), 1/2))
          valueIncrement = (finalValue - this.currentValue) / remaining
          //console.log("recalculate, samples ", remaining, ", currentValue ", this.currentValue, "finalValue",  finalValue, "valueIncrement ", valueIncrement)
        }

        // per-sample updating our position (how far are we in this segment) and value
        this.segmentPosition += this.segmentIncrement
        this.currentValue += valueIncrement
        if (this.currentValue > 1.0) {
          this.currentValue = 1.0
        }
        if (this.currentValue < 0) {
          this.currentValue = 0
        }

        if (this.segmentPosition > 1.0) {
          this.incrementState()
        }
      }
      
      let result = this.previousValue + ((this.currentValue - this.previousValue) * 0.08)
      output[i] = result
      this.previousValue = result
    }

    return true
  }
}

try {
  // @ts-ignore
  registerProcessor('envelope-generator-processor', EnvelopeGeneratorProcessor)
} catch (error) {
	// eslint-disable-next-line no-console
	console.warn(error);
}
