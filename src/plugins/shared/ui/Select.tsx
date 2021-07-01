import { Component, h } from 'preact';

export type HTMLInputEvent = Event & {target: HTMLInputElement }

export interface SelectProps {
    label?: string
    onChange?(v: string): void
    value: () => string | number | boolean
    options: string[]
    values?: string[] | number[] | boolean[]
    style?: string
}

export class Select<T> extends Component<SelectProps, any> {
    lastRenderedValue: string | number | boolean
    animationRequest?: number
    animationTimeout?: number

    ref?: HTMLDivElement
    select?: HTMLSelectElement

    constructor() {
        super();

        this.lastRenderedValue = "-1"
        this.animationFrame = this.animationFrame.bind(this)
        this.scheduleFrame = this.scheduleFrame.bind(this)
        this.scheduleAnimation = this.scheduleAnimation.bind(this)
    }

    onChange(e: HTMLInputEvent) {
        if (this.props.onChange) {
            this.props.onChange(e.target!.value)
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
        this.animationTimeout = window.setTimeout(this.scheduleFrame, 100)
    }

    scheduleFrame() {
        this.animationRequest = window.requestAnimationFrame(this.animationFrame)
    }

    componentWillUnmount() {
       this.cancelAnimation()
    }

    animationFrame() {
        let newValue = this.props.value()
        if (this.lastRenderedValue == newValue) {
            this.scheduleAnimation()

            return
        }

        this.lastRenderedValue = newValue

        for (let option of this.select.options) {
            option.selected = (option.value == newValue)
        }

        this.scheduleAnimation()
    }

    setup(ref: HTMLDivElement | null) {
        if (ref == null) {
            return
        }

        if (ref == this.ref) {
            return
        }

        this.ref = ref
        ref.innerHTML = ""

        if (this.props.value === undefined || this.props.value === null) {
            throw `Select with label ${this.props.label} values ${this.props.values} has null value`
        }

        this.select = document.createElement("select");

        this.props.options.forEach((name, index) => {
            let option = document.createElement("option");
            option.text = name
            option.value = (this.props.values) ? this.props.values[index].toString() : index.toString()
            this.select.appendChild(option)
        })

        this.select.addEventListener("change", e => this.onChange(e as HTMLInputEvent))

        this.ref.appendChild(this.select)

        this.cancelAnimation()
        this.animationFrame()
    }

    render() {
        h("div", {})

        let style = this.props.style ? this.props.style : ""

        return <div class="component-wrapper" style={style}>
            {this.props.label && <label>{this.props.label}</label>}
            <div ref={(e) => this.setup(e)} class="component-select text-black">
            </div>
        </div>
    }
}