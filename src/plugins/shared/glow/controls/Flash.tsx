import { Component, h } from "preact";
import styles from "./Flash.scss"

export enum FlashStyle {
    Success,
    Warning,
    Error
}

export interface FlashProps {
    style: FlashStyle
}

export class Flash extends Component<FlashProps, any> {
    render() {
        let style = styles.success
        switch(this.props.style) {
        case FlashStyle.Error:
            style = styles.error;
            break
        case FlashStyle.Warning:
            style = styles.warning;
            break
        }

        return <div class={style}>{this.props.children}</div>
    }
}