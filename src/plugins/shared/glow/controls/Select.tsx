import { Component, h } from 'preact';
import styles from './Select.scss';

export type HTMLInputEvent = Event & {target: HTMLInputElement }

export interface SelectProps {
    label?: string
    onChange?(v: string): void
    value: string | number | boolean
    options: string[]
    values?: string[] | number[] | boolean[]
    style?: string
}

export class Select<T> extends Component<SelectProps, any> {
    lastRenderedValue: string;

    constructor() {
        super();

        this.lastRenderedValue = "-1"
    }

    onChange(e: HTMLInputEvent) {
        if (this.props.onChange) {
            this.props.onChange(e.target!.value)
        }
    }

    setup(ref: HTMLDivElement | null) {
        if (ref == null) {
            return
        }

        if (this.lastRenderedValue == this.props.value) {
            return
        }
        ref.innerHTML = ""

        this.lastRenderedValue = this.props.value.toString()
        let select = document.createElement("select")
        select.setAttribute("class", styles.Default)
        select.addEventListener("change", e => this.onChange(e as HTMLInputEvent))

        this.props.options.forEach((name, index) => {
            let option = document.createElement("option");
            option.text = name
            option.value = (this.props.values) ? this.props.values[index].toString() : index.toString()
            option.selected = (option.value == this.props.value)
            select.appendChild(option)
        })
        ref.appendChild(select)
    }

    render() {
        return <div ref={(e) => this.setup(e)}></div>
    }
}