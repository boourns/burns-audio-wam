import { Component, h } from "preact";
import styles from "./Tag.scss";

export enum TagStyle {
    Default,
    Red
}

export interface TagProps {
    style: TagStyle
}

export class Tag extends Component<TagProps, any> {
    render() {
        let style = styles.Accent
        switch (this.props.style) {
            case TagStyle.Red:
                style = styles.Red
                break
        }

        return <span class={style}>{this.props.children}</span>
    }
}