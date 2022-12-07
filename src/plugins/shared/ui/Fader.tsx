import { Component, h } from 'preact';
import { svg_create, svg_line, svg_rectangle, svg_update_line, svg_update_rectangle } from './svg'

export interface FaderProps {
    value: () => number
    automationValue?: () => number

    width: number
    height: number
    minimumValue: number
    maximumValue: number
    capHeight: number
    capWidth: number
    color: string
    label?: string

    onChange(value: number): void
    valueString?(value: number): string
    units?: string
    decimals?: number
    showValue?: boolean
}

type FaderState = {
}

export class Fader extends Component<FaderProps, FaderState> {
    pressed: boolean
    ref?: HTMLDivElement
    position?: { x: number; y: number; }

    center!: number
    svg!: SVGElement
    fader!: SVGElement
    automatedValueTrack!: SVGElement
    valueLabel?: HTMLLabelElement | null

    animationRequest?: number
    animationTimeout?: number
    lastValue?: number
    lastAutomationValue?: number

    static defaultProps = {
        minimumValue: 0.0,
        maximumValue: 1.0,
        width: 30,
        height: 120,
        capWidth: 20,
        capHeight: 8,
        color: 'yellow',
        units: "",
        decimals: 2,
        showValue: true
    }

    constructor() {
        super()

        this.pressed = false

        this.onMousemove = this.onMousemove.bind(this)
        this.onMouseup = this.onMouseup.bind(this)
        this.animationFrame = this.animationFrame.bind(this)
        this.scheduleFrame = this.scheduleFrame.bind(this)
        this.scheduleAnimation = this.scheduleAnimation.bind(this)
    }

    componentWillUnmount() {
        if (this.pressed) {
            window.removeEventListener('mousemove', this.onMousemove)
            window.removeEventListener('mouseup', this.onMouseup)
        }

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
        this.animationTimeout = window.setTimeout(this.scheduleFrame, this.pressed ? 10 : 100)
    }

    scheduleFrame() {
        this.animationRequest = window.requestAnimationFrame(this.animationFrame)
    }

    animationFrame() {
        let newValue = this.props.value()
        let newAutomationValue = this.props.automationValue ? this.props.automationValue() : undefined
        if (newValue == this.lastValue && newAutomationValue == this.lastAutomationValue) {
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

        var percent = (newValue - this.props.minimumValue) / (this.props.maximumValue - this.props.minimumValue)
        var position = (this.props.height - this.props.capHeight) - ((this.props.height - this.props.capHeight) * percent)

        if (this.lastValue != newValue) {
            svg_update_rectangle(this.fader, this.center - (this.props.capWidth/2), position, this.props.capWidth, this.props.capHeight, this.props.color)    
        }

        if (newAutomationValue || newAutomationValue === 0) {
            percent = (newAutomationValue - this.props.minimumValue) / (this.props.maximumValue - this.props.minimumValue)
            let automatedPosition = (this.props.height) - ((this.props.height) * percent)
            let x = this.center

            svg_update_line(this.automatedValueTrack, x, automatedPosition, x, position, "white")    
        }

        this.lastAutomationValue = newAutomationValue
        this.lastValue = newValue

        this.scheduleAnimation()
    }

    setup(ref: HTMLDivElement | null) {
        if (ref == null) {
            return
        }
        if (this.ref == ref) {
            return
        }

        this.ref = ref

        ref.innerHTML = ""

        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute('style', "stroke:black; fill:none; stroke-width:2");
        this.svg.setAttribute('width', `${this.props.width}px`);
        this.svg.setAttribute('height', `${this.props.height}`);

        this.center = this.props.width/2;
        let track = svg_line(this.center, 0, this.center, this.props.height, "black");
        this.automatedValueTrack = svg_line(this.center, 0, this.center, this.props.height, "white");
                
        this.fader = svg_create("rect")
        
        this.svg.appendChild(track)
        if (this.props.automationValue) {
            this.svg.appendChild(this.automatedValueTrack)
        }

        this.svg.appendChild(this.fader)
        ref.appendChild(this.svg)

        this.cancelAnimation()

        this.animationFrame()
    }

    onMousedown(e: MouseEvent) {
        this.pressed = true
        this.position = {x: e.screenX, y: e.screenY}

        window.addEventListener('mousemove', this.onMousemove)
        window.addEventListener('mouseup', this.onMouseup)
    }

    onMouseup(e: MouseEvent) {
        this.pressed = false
        window.removeEventListener('mousemove', this.onMousemove)
        window.removeEventListener('mouseup', this.onMouseup)
    }

    onMousemove(e: MouseEvent) {
        if (this.pressed) {
            let distance = (e.screenY - this.position!.y)
            this.position = {x: e.screenX, y: e.screenY}

            this.setValue(this.props.value() - (distance * 0.01 * (this.props.maximumValue - this.props.minimumValue)))
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

        return <div class="ComponentWrapper">
            <label>{this.props.label ? this.props.label : ""}</label>
            <div ref={(ref) => this.setup(ref)} class="Fader"
                onMouseDown={(e) => this.onMousedown(e)}>
            </div>
            <small><label ref={ref => { this.valueLabel = ref; this.lastValue = undefined} }></label></small>
        </div>
        
    }
}