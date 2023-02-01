import { Component, h } from 'preact';

export interface ToggleProps {
    value: () => boolean
    color: () => string

    width: number
    height: number
    label?: string

    onChange(value: boolean): void
}

type ToggleState = {
}

export class Toggle extends Component<ToggleProps, ToggleState> {
    ref?: HTMLCanvasElement

    static editing: boolean = false

    context!: CanvasRenderingContext2D

    animationRequest?: number
    animationTimeout?: number
    lastValue?: boolean
    lastColor?: string

    static defaultProps = {
        width: 30,
        height: 30,
    }

    constructor() {
        super()

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
        if (!this.context) {
            return
        }

        let newValue = this.props.value()
        let newColor = this.props.color()

        if (newValue == this.lastValue && newColor == this.lastColor) {
            this.scheduleAnimation()
            return
        }

        this.draw(newColor, newValue)
        
        this.lastColor = newColor
        this.lastValue = newValue

        this.scheduleAnimation()
    }

    draw(color: string, value: boolean) {
        if (!this.context || !this.context.beginPath) {
            return
        }

        // clear
        this.context.beginPath();
        this.context.rect(0, 0, this.props.width, this.props.height);
        if (value) {
            this.context.fillStyle = color
        } else {
            this.context.fillStyle = 'rgb(0,0,0)' //'var(--var-ControlBackground)';
        }
        this.context.strokeStyle = color
        this.context.fill();
        this.context.stroke();

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

    onClick(e: MouseEvent) {
        this.setValue(!this.props.value())
    }

    setValue(v: boolean) {
        if (this.props.onChange) {
            this.props.onChange(v)
        }
    }

    render() {
        h("div", {})

        return <div class="ComponentWrapper">
            {this.props.label ? <label>{this.props.label}</label> : ""}
            <canvas style={`width: ${this.props.width}px; height: ${this.props.height}px; margin: auto;`} ref={(ref) => this.setup(ref)}
                onClick={(e) => this.onClick(e)}
                ></canvas>
        </div>
        
    }
}