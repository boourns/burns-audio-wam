import { Component, h } from "preact";

import styles from "./Button.scss";

export enum ButtonStyle {
    Default,
    Success,
    Destructive,
    TopBar,
    TopBarSuccess,
    TopBarMenu,
    Transport
}

export interface ButtonProps {
    style?: ButtonStyle
    extraStyles?: string
    disabled?: boolean
    onClick: () => void
}

export class Button extends Component<ButtonProps, any> {
    render() {
        let style = styles.default;
        switch(this.props.style) {
            case ButtonStyle.Success:
                style = styles.success
                break
            case ButtonStyle.Destructive:
                style = styles.destructive
                break
            case ButtonStyle.TopBar:
                style = styles.topbar
                break
            case ButtonStyle.TopBarMenu:
                style = styles.topbarMenu
                break
            case ButtonStyle.TopBarSuccess:
                style = styles.topbarSuccess
                break
            case ButtonStyle.Transport:
                style = styles.transport
                break
        }

        return <button disabled={!!this.props.disabled} class={style} style={this.props.extraStyles} onClick={() => this.props.onClick()}>{this.props.children}</button>
    }
}