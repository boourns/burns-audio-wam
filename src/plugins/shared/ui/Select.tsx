import { realpathSync } from 'fs';
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

    renderedOptions?: string[]
    renderedValues?: any[]

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
        
        if (ref == this.ref && this.sameArray(this.props.options, this.renderedOptions) && this.sameArray(this.props.values, this.renderedValues)) {
            return
        }

        this.ref = ref
        ref.innerHTML = ""

        if (this.props.value === undefined || this.props.value === null) {
            throw `Select with label ${this.props.label} values ${this.props.values} has null value`
        }

        if (!this.select) {
            this.select = document.createElement("select");
            this.select.addEventListener("change", e => this.onChange(e as HTMLInputEvent))
        } else {
            while (this.select.firstChild) {
                this.select.removeChild(this.select.firstChild);
            }

            try {
                this.ref.removeChild(this.select)
            } catch (e) {

            }
        }

        this.ref.appendChild(this.select)

        this.props.options.forEach((name, index) => {
            let option = document.createElement("option");
            option.text = name
            option.value = (this.props.values) ? this.props.values[index].toString() : index.toString()
            console.log("Adding option ", option.text, "value ", option.value)
            this.select.appendChild(option)
        })

        this.lastRenderedValue = "-1"
        this.renderedOptions = this.props.options
        this.renderedValues = this.props.values

        this.cancelAnimation()
        this.animationFrame()
    }

    render() {
        h("div", {})

        let style = this.props.style ? this.props.style : ""

        return <div class="component-wrapper" style={style}>
            {this.props.label && <label>{this.props.label}</label>}
            <div ref={(e) => this.setup(e)} style="color: black;" class="component-select">
            </div>
        </div>
    }

    sameArray(lhs?: any[], rhs?: any[]): boolean {
        // if both are undefined, return true
        if (lhs === undefined && rhs === undefined) {
            return true
        }

        // if only one is undefined, return false
        if (lhs === undefined || rhs === undefined) {
            return false
        }

        // same length and all items match
        return (lhs.length == rhs.length && lhs.every((l, i) => l == rhs[i]))
    }
}