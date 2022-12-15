import { Component, h } from 'preact';
import { svg_arc, svg_create, svg_update_arc } from './svg'

export type KnobProps = {
    value: () => number

    label: string
    size: number
    padding: number
    bipolar: boolean
    integer?: boolean
    minimumValue: number
    maximumValue: number
    defaultValue?: number
    color: string
    onChange(value: number): void
    valueString?(value: number): string
    units?: string
    decimals?: number
    showValue?: boolean
}

type KnobState = {
}

export class Knob extends Component<KnobProps, KnobState> {
    static defaultProps = {
        minimumValue: 0.0,
        maximumValue: 1.0,
        size: 50,
        value: 0.5,
        padding: 3,
        integer: false,
        color: 'yellow',
        label: "",
        bipolar: false,
        units: "",
        decimals: 2,
        showValue: true,
    }

    pressed: boolean;
    ref?: HTMLDivElement;
    position?: { x: number; y: number; };
    dragStartValue?: number

    center!: [number, number]
    radii!: [number, number]

    svg!: SVGElement
    range!: SVGElement
    arc!: SVGElement
    valueLabel?: HTMLLabelElement | null

    animationRequest?: number
    animationTimeout?: number
    lastValue?: number

    constructor() {
        super();

        this.pressed = false

        this.onMousemove = this.onMousemove.bind(this)
        this.onMouseup = this.onMouseup.bind(this)
        this.animationFrame = this.animationFrame.bind(this)
        this.scheduleFrame = this.scheduleFrame.bind(this)
        this.scheduleAnimation = this.scheduleAnimation.bind(this)    
    }

    componentDidMount() {
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
        if (newValue == this.lastValue) {
            this.scheduleAnimation()
            
            return
        }

        this.lastValue = newValue

        if (this.valueLabel) {
            if (this.props.valueString) {
                this.valueLabel.innerText = this.props.valueString(newValue)
            } else {
                this.valueLabel.innerText = `${newValue.toFixed(this.props.decimals)}${this.props.units}`
            }
        }

        if (this.props.bipolar) {
            let midValue = (this.props.maximumValue + this.props.minimumValue) / 2
            let percent = (newValue - midValue) / (midValue - this.props.minimumValue);

            svg_update_arc(this.arc, this.center, this.radii, [270, 135*percent], 0 )
        } else {
            let percent = (newValue - this.props.minimumValue) / (this.props.maximumValue - this.props.minimumValue)
            svg_update_arc(this.arc, this.center, this.radii, [135, 270*percent], 0 )
        }
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
        this.svg.setAttribute('style', "stroke:var(--var-ControlBackground); fill:none; stroke-width:2");
        this.svg.setAttribute('width', `${this.props.size}`);
        this.svg.setAttribute('height', `${this.props.size * 4/5}`);

        this.center = [this.props.size/2, this.props.size/2]
        this.radii = [this.center[0] - this.props.padding, this.center[1] - this.props.padding]

        this.range = svg_arc (this.center, this.radii, [136, 270], 0 )
        this.range.setAttribute('style', 'stroke:var(--var-ControlBackground);')
        this.svg.appendChild(this.range)

        ref.appendChild(this.svg)

        this.arc = svg_create("path")
        this.arc.setAttribute('style', `stroke:${this.props.color};`)
        this.svg.appendChild(this.arc)

        this.cancelAnimation()

        this.animationFrame()
    }

    onDoubleClick(e: MouseEvent) {
        if (this.props.defaultValue !== undefined) {
            this.setValue(this.props.defaultValue)
        }
    }

    onMousedown(e: MouseEvent) {
        this.pressed = true
        this.position = {x: e.screenX, y: e.screenY}
        this.dragStartValue = this.props.value()

        window.addEventListener('mousemove', this.onMousemove)
        window.addEventListener('mouseup', this.onMouseup)
    }

    onMouseup(e: MouseEvent) {
        this.pressed = false
        this.dragStartValue = undefined
        window.removeEventListener('mousemove', this.onMousemove)
        window.removeEventListener('mouseup', this.onMouseup)
    }

    onMousemove(e: MouseEvent) {
        if (this.pressed) {
            let distance = (e.screenX - this.position!.x) - (e.screenY - this.position!.y)
            if (!this.props.integer || Math.abs(distance) > 0.5) {
                this.setValue(this.dragStartValue! + (distance * 0.005 * (this.props.maximumValue - this.props.minimumValue)))
            }
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

        let value
        if (this.props.showValue) {
            value = <small><label ref={ref => { this.valueLabel = ref; this.lastValue = undefined} }></label></small>
        }

        return (
        <div class="ComponentWrapper">
            <label>{this.props.label}</label>
            <div ref={(ref) => this.setup(ref)} class="Knob" style={`height: ${this.props.size}px; width: ${this.props.size}px;`}
                onMouseDown={(e) => this.onMousedown(e)}
                onDblClick={(e) => this.onDoubleClick(e)}
                >
            </div>
            {value}
        </div>
        )
    }
}
