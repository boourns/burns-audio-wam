import { Component, h } from 'preact';

export interface VUMeterProps {
    node: AudioNode
    width: number
    height: number
    channelIndex?: number
}

type VUMeterState = {
}

export class VUMeter extends Component<VUMeterProps, VUMeterState> {
    ref?: HTMLCanvasElement
    position?: { x: number; y: number; }

    center!: number
    canvas!: CanvasRenderingContext2D | null
    animationRequest?: number
    lastValue: number
    analyser!: AnalyserNode
    bufferLength!: number
    dataArray!: Uint8Array

    animationTimeout?: number

    static defaultProps = {
        width: 15,
        height: 120,
    }

    constructor() {
        super()

        this.lastValue = 0
        this.animationFrame = this.animationFrame.bind(this)
        this.scheduleAnimationFrame = this.scheduleAnimationFrame.bind(this)
    }

    componentDidMount() {
        this.analyser = this.props.node.context.createAnalyser()
        this.analyser.smoothingTimeConstant = 0.85
        this.analyser.fftSize = 1024
        this.bufferLength = this.analyser.frequencyBinCount
        this.dataArray = new Uint8Array(this.bufferLength)
        if (this.props.channelIndex) {
            this.props.node.connect(this.analyser, this.props.channelIndex)
        } else {
            this.props.node.connect(this.analyser)
        }
    }

    componentWillUnmount() {
        this.analyser.disconnect()

        if (this.animationRequest != undefined) {
            window.cancelAnimationFrame(this.animationRequest)
            this.animationRequest = undefined
        }
    }

    cancelAnimation() {
        if (this.animationTimeout != undefined) {
            window.clearTimeout(this.animationTimeout)
            this.animationTimeout = undefined
        }

        if (this.animationRequest != undefined) {
            window.cancelAnimationFrame(this.animationRequest)
            this.animationRequest = undefined
        }
    }

    scheduleAnimation() {
        this.animationTimeout = window.setTimeout(this.scheduleAnimationFrame, 30)
    }

    scheduleAnimationFrame() {
        this.animationRequest = window.requestAnimationFrame(this.animationFrame)
    }

    calculateValue(): number {
      this.analyser.getByteTimeDomainData(this.dataArray)

      // @ts-ignore
      const max = Math.max.apply(null, this.dataArray)
      // @ts-ignore
      const min = Math.min.apply(null, this.dataArray)

      let amp = max - min
      amp /= 240

      //converts amps to db
      var db = 20 * (Math.log(amp) / Math.log(10))

      if (db < -60) {
          db = -60
      }
      if (db > +6) {
          db = 6
      }

      return db
    }

    animationFrame() {
        if (!this.analyser) {
            this.scheduleAnimation()

            return
        }

        if (!this.canvas) {
            return
        }

        let newValue = this.calculateValue()
        if (newValue > this.lastValue) {
            this.lastValue = newValue
        } else {
            this.lastValue = this.lastValue - 3.0
            this.lastValue = (newValue > this.lastValue) ? newValue : this.lastValue
        }

        let percent = (this.lastValue+60) / 66

        let length = (this.props.height * percent)
        let position = this.props.height - length

        let fill = newValue > 0.99 ? "red" : "green"

        this.canvas.beginPath();
        this.canvas.rect(0, 0, this.props.width, this.props.height);
        this.canvas.fillStyle = 'rgb(0,0,0)';
        this.canvas.fill();
        this.canvas.beginPath();
        this.canvas.rect(0, position, this.props.width, length);
        this.canvas.fillStyle = fill
        this.canvas.fill();
        
        this.scheduleAnimation()
    }

    setup(ref: HTMLCanvasElement | null) {
        if (ref == null) {
            return
        }
        if (this.ref == ref) {
            return
        }

        this.ref = ref

        ref.innerHTML = ""

        this.canvas = ref.getContext('2d')
        if (!this.canvas) {
            return
        }

        this.ref.setAttribute('width', `${this.props.width}px`);
        this.ref.setAttribute('height', `${this.props.height}`);

        this.animationFrame()
    }

    render() {
        h("div", {})

        return <div class="component-wrapper">
            <canvas ref={(ref) => this.setup(ref)}></canvas>
        </div>
    }
}