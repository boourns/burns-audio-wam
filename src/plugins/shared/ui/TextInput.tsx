import { Component, h } from 'preact';

export type HTMLInputEvent = Event & {target: HTMLInputElement }

export interface TextInputProps {
    onChange?(e: HTMLInputEvent): void
    value: string | number
    className?: string
    password?: boolean
    onEnter?(): void
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
            alert("Enter pressed!")
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
        input.setAttribute("class", (this.props.className ? this.props.className : "") + " p-0.5 border border-gray-500" );
        if (this.lastRenderedValue != this.props.value) {
            this.lastRenderedValue = this.props.value.toString();
            input.value = this.lastRenderedValue;
        }

        // @ts-ignore
        input.removeEventListener("change", this.onChange)
        // @ts-ignore
        input.addEventListener("change", this.onChange)
    }

    render() {
        h("div", {})

        return <div ref={(e) => this.setup(e)} />
    }
}