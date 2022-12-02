import { Component, h } from 'preact';

export interface SliderProps {
    value: () => number

    width: number
    height: number
    minimumValue: number
    maximumValue: number
    defaultValue?: number
    showValue?: boolean

    color: () => string
    label?: string

    onChange(value: number): void

    valueString?(value: number): string
    units?: string
    decimals?: number
}

type SliderState = {
}

export class Slider extends Component<SliderProps, SliderState> {
    ref?: HTMLCanvasElement

    context!: CanvasRenderingContext2D
    valueLabel?: HTMLLabelElement | null

    animationRequest?: number
    animationTimeout?: number
    lastValue?: number

    static defaultProps = {
        minimumValue: 0.0,
        maximumValue: 1.0,
        width: 30,
        height: 120,
        color: 'var(--var-ControlDefault)',
        units: "",
        decimals: 2
    }

    constructor() {
        super()

        this.onMousemove = this.onMousemove.bind(this)
        this.animationFrame = this.animationFrame.bind(this)
        this.scheduleFrame = this.scheduleFrame.bind(this)
        this.scheduleAnimation = this.scheduleAnimation.bind(this)
    }

    componentWillUnmount() {
        this.cancelAnimation()
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
        this.animationTimeout = window.setTimeout(this.scheduleFrame, 10)
    }

    scheduleFrame() {
        this.animationRequest = window.requestAnimationFrame(this.animationFrame)
    }

    animationFrame() {
        let newValue = this.props.value()
        if (newValue == this.lastValue) {
            this.scheduleAnimation()
            return
        }

        if (this.valueLabel) {
            if (this.props.valueString) {
                this.valueLabel.innerText = this.props.valueString(newValue)
            } else {
                this.valueLabel.innerText = `${newValue.toFixed(this.props.decimals)}${this.props.units}`
            }
        }

        if (this.lastValue != newValue) {
            this.draw(newValue)
        }

        this.lastValue = newValue

        this.scheduleAnimation()
    }

    draw(value: number) {
        var percent = (value - this.props.minimumValue) / (this.props.maximumValue - this.props.minimumValue)
        var position = (this.props.height) - ((this.props.height) * percent)

        // clear
        this.context.beginPath();
        this.context.rect(0, 0, this.props.width, this.props.height);
        this.context.fillStyle = 'rgb(0,0,0)' //'var(--var-ControlBackground)';
        this.context.strokeStyle = 'rgb(255, 0, 0)'
        this.context.fill();
        this.context.stroke();

        this.context.beginPath();
        this.context.rect(0, position, this.props.width, this.props.height - position);
        this.context.fillStyle = 'rgb(255,0,0)'
        this.context.fill();

        this.context.closePath();
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

        this.ref.setAttribute('width', `${this.props.width}`);
        this.ref.setAttribute('height', `${this.props.height}`);

        this.context = this.ref.getContext("2d")!

        this.cancelAnimation()

        this.animationFrame()
    }

    onMousemove(e: MouseEvent) {
        if (!this.ref) {
            return
        }

        if (e.buttons == 1) {
            var rect = this.ref.getBoundingClientRect();
            const position = (e.clientY - rect.top) / (rect.bottom - rect.top)

            this.setValue((1-position) * (this.props.maximumValue - this.props.minimumValue))
        }
    }

    onDoubleClick(e: MouseEvent) {
        if (this.props.defaultValue !== undefined) {
            this.setValue(this.props.defaultValue)
        }
    }

    setValue(v: number) {
        if (v > this.props.maximumValue) {
            v = this.props.maximumValue
        }
        if (v < this.props.minimumValue) {
            v = this.props.minimumValue
        }

        if (this.props.onChange) {
            this.props.onChange(v)
        }
    }

    render() {
        h("div", {})

        return <div style="display: flex; flex-direction: column;">
            {this.props.label ? <label>this.props.label</label> : ""}
            <canvas ref={(ref) => this.setup(ref)} class=""
                onMouseMove={(e) => this.onMousemove(e)}
                onDblClick={(e) => this.onDoubleClick(e)}
                ></canvas>

            <small><label ref={ref => { this.valueLabel = ref; this.lastValue = undefined} }></label></small>
        </div>
        
    }
}