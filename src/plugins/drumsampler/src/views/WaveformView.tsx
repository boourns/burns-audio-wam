import { h, Component } from 'preact';

export interface WaveformViewProps {
    width: number
    height: number
    buffer: AudioBuffer
}

type WaveformFrame = {
    min: number
    max: number
}

export class WaveformView extends Component<WaveformViewProps, any> {
    canvasRef?: HTMLCanvasElement
    canvas?: CanvasRenderingContext2D
    container?: HTMLDivElement

    setupContainer(ref: HTMLDivElement | null) {
        if (!ref) {
            return
        }
        this.container = ref
        this.setup()
    }

    setupCanvas(ref: HTMLCanvasElement| null) {
        if (!ref) {
            return
        }
        this.canvasRef = ref
        this.setup()
    }

    calculateWaveform(channel: number): WaveformFrame[] {
        let data = this.props.buffer.getChannelData(0)
        let count = this.props.width

        let result: WaveformFrame[] = []

        let samplesPerPixel = data.length / count

        let min = 0
        let max = 0
        let acc = 0
        for (let i = 0; i < data.length; i++) {
            if (data[i] < min) {
                min = data[i]
            }
            if (data[i] > max) {
                max = data[i]
            }
            acc++
            if (acc > samplesPerPixel) {
                result.push({min, max})
                min = data[i]
                max = data[i]
                acc = 0
            }
        }

        return result
    }

    draw() {
        this.canvas.beginPath();
        this.canvas.rect(0, 0, this.props.width, this.props.height);
        this.canvas.fillStyle = 'rgb(0,0,0)';
        this.canvas.fill();

        if (!this.props.buffer) {
            return
        }

        let waveform = this.calculateWaveform(0)
        this.canvas.beginPath()
        this.canvas.lineWidth = 1
        this.canvas.strokeStyle = "green";
        let mid = this.props.height/2
        for (let i = 0; i < waveform.length; i++) {
            this.canvas.moveTo(i, Math.round(mid + (mid*waveform[i].min)))
            this.canvas.lineTo(i, Math.round(mid + (mid*waveform[i].max)))
        }
        this.canvas.stroke()

    }

    setup() {
        if (!this.container || !this.canvasRef) {
            return
        }

        this.container.addEventListener("resize", (ev) => {
            console.log("Waveform's container resized to ", this.container.clientWidth, this.container.clientHeight)
            this.canvasRef.width = this.container.clientWidth
            this.canvasRef.height = this.container.clientHeight
        })

        this.canvasRef.width = this.props.width
        this.canvasRef.height = this.props.height

        this.canvas = this.canvasRef.getContext("2d")

        this.draw()
    }

    render() {
        return <div ref={(ref => this.setupContainer(ref))} style="width:100%;">
                <canvas ref={(ref) => this.setupCanvas(ref)}></canvas>
            </div>
    }
}