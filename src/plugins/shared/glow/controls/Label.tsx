import { Component, h } from "preact";
import styles from "./Label.scss";

export enum LabelStyle {
    SectionHeader,
    BoxHeader,
    PageHeader,
    Control,
}

export interface LabelProps {
    style?: LabelStyle
}

export class Label extends Component<LabelProps, {}> {
    render() {
        var style = styles.control
        switch (this.props.style) {
            case LabelStyle.SectionHeader:
                style = styles.formSection
                break
            case LabelStyle.BoxHeader:
                style = styles.boxHeader
                break
            case LabelStyle.PageHeader:
                style = styles.pageHeader
                break
        }
        return <span class={style}>{this.props.children}</span>
    }
}