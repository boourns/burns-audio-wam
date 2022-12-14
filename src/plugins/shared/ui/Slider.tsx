import { Component, h } from 'preact';

export interface SliderProps {
    value: () => number

    width: number
    height: number
    minimumValue: number
    maximumValue: number
    defaultValue?: number
    showValue?: boolean
    horizontal?: boolean

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

    static editing: boolean = false

    context!: CanvasRenderingContext2D
    valueLabel?: HTMLLabelElement | null

    animationRequest?: number
    animationTimeout?: number
    lastValue?: number
    lastColor?: string

    static defaultProps = {
        minimumValue: 0.0,
        maximumValue: 1.0,
        width: 30,
        height: 120,
        units: "",
        decimals: 2
    }

    constructor() {
        super()

        this.onMousemove = this.onMousemove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)

        this.animationFrame = this.animationFrame.bind(this)
        this.scheduleFrame = this.scheduleFrame.bind(this)
        this.scheduleAnimation = this.scheduleAnimation.bind(this)
    }

    componentWillUnmount() {
        this.cancelAnimation()
        window.removeEventListener('mouseup', this.onMouseUp)
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
        if (!this.context) {
            return
        }

        let newValue = this.props.value()
        let newColor = this.props.color()

        if (newValue == this.lastValue && newColor == this.lastColor) {
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

        this.draw(newColor, newValue)
        
        this.lastColor = newColor
        this.lastValue = newValue

        this.scheduleAnimation()
    }

    bipolar(): boolean {
        return this.props.minimumValue < 0
    }

    draw(color: string, value: number) {
        var percent = (value - this.props.minimumValue) / (this.props.maximumValue - this.props.minimumValue)

        const length = this.props.horizontal ? this.props.width : this.props.height
        const position = (length) - (length * percent)

        if (!this.context || !this.context.beginPath) {
            return
        }

        // clear
        this.context.beginPath();
        this.context.rect(0, 0, this.props.width, this.props.height);
        this.context.fillStyle = 'rgb(0,0,0)' //'var(--var-ControlBackground)';
        this.context.strokeStyle = color
        this.context.fill();
        this.context.stroke();

        this.context.beginPath();
        if (this.bipolar()) {
            if (this.props.horizontal) {
                this.context.rect((this.props.width/2), 0, (this.props.width/2) - position, this.props.height)
            } else {
                this.context.rect(0, position, this.props.width, (this.props.height/2) - position)
            }
            
        } else {
            if (this.props.horizontal) {
                this.context.rect(0, 0, position, this.props.height);
            } else {
                this.context.rect(0, position, this.props.width, this.props.height - position);
            }
        }

        this.context.fillStyle = color
        this.context.fill();

        this.context.closePath();
    }

    setup(ref: HTMLCanvasElement | null) {
        if (ref == null) {
            this.cancelAnimation()

            this.context = undefined
            this.ref = undefined
            this.lastColor = undefined
            this.lastValue = undefined

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
        
        if (!this.context) {
            console.error("Failed to get 2d context for canvas")
        }

        this.cancelAnimation()

        this.animationFrame()
    }

    onMousemove(e: MouseEvent) {
        if (!this.ref) {
            return
        }

        if (e.buttons == 1 && Slider.editing) {
            var rect = this.ref.getBoundingClientRect();
            let position: number
            if (this.props.horizontal) {
                position = (e.clientX - rect.left) / (rect.right - rect.left)
            } else {
                position = 1 - ((e.clientY - rect.top) / (rect.bottom - rect.top))
            }

            this.setValue(this.props.minimumValue + (position * (this.props.maximumValue - this.props.minimumValue)))
        }
    }

    onDoubleClick(e: MouseEvent) {
        if (this.props.defaultValue !== undefined) {
            this.setValue(this.props.defaultValue)
        }
    }

    onMouseDown(e: MouseEvent) {
        Slider.editing = true

        window.addEventListener('mouseup', this.onMouseUp)
    }

    onMouseUp(e: MouseEvent) {
        Slider.editing = false

        window.removeEventListener('mouseup', this.onMouseUp)

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

        let valueLabel
        if (this.props.showValue) {
            valueLabel = <small><label ref={ref => { this.valueLabel = ref; this.lastValue = undefined} }></label></small>
        }

        return <div style="display: flex; flex-direction: column;">
            {this.props.label ? <label>this.props.label</label> : ""}
            <canvas ref={(ref) => this.setup(ref)} class=""
                onMouseMove={(e) => this.onMousemove(e)}
                onDblClick={(e) => this.onDoubleClick(e)}
                onMouseDown={(e) => this.onMouseDown(e)}
                ></canvas>
            {valueLabel}
        </div>
        
    }
}