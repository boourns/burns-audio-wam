import { Component, h } from 'preact';
import styles from './TextInput.scss';

export type HTMLInputEvent = Event & {target: HTMLInputElement }

export enum TextInputStyle {
    Default,
    TopBar,
}

export interface TextInputProps {
    onChange?(e: HTMLInputEvent): void
    value: string | number
    className?: string
    style?: TextInputStyle
    password?: boolean
    onEnter?(): void
    disabled?: boolean
}

export class TextInput extends Component<TextInputProps, any> {
    lastRenderedValue: string | number;
    ref?: HTMLDivElement

    constructor() {
        super();

        this.lastRenderedValue = "blank"
        this.onChange = this.onChange.bind(this)
        this.onKeyUp = this.onKeyUp.bind(this)

    }

    onChange(e: HTMLInputEvent) {
        if (this.props.onChange) {
            this.props.onChange(e)
        }
    }

    onKeyUp(e: KeyboardEvent) {
        if (e.key === "Enter") {
            if (this.props.onEnter) {
                this.props.onEnter()
            }
        }
    }

    setup(ref: HTMLDivElement | null | undefined) {
        if (!ref) {
            return
        }

        if (this.ref != ref) {
            ref.innerHTML = ""
            let input = document.createElement("input");
            ref.appendChild(input)
            this.ref = ref
        }
        
        let input = ref.children[0] as unknown as HTMLInputElement

        input.setAttribute("type", this.props.password ? "password" : "text");

        var style = styles.default
        switch (this.props.style) {
            case TextInputStyle.TopBar:
                style = styles.topbar
                break
        }

        input.setAttribute("class", (this.props.className ? this.props.className : "") + " " + style );
        if (this.lastRenderedValue != this.props.value) {
            this.lastRenderedValue = this.props.value.toString();
            input.value = this.lastRenderedValue;
        }

        if (this.props.disabled) {
            input.setAttribute("disabled", "true")
        } else {
            input.removeAttribute("disabled")
        }

        // @ts-ignore
        input.removeEventListener("change", this.onChange)
        input.removeEventListener("keyup", this.onKeyUp)

        // @ts-ignore
        input.addEventListener("change", this.onChange)
        input.addEventListener("keyup", this.onKeyUp)
    }

    render() {
        return <div style="display: flex;" ref={(e) => this.setup(e)} />
    }
}