import { Component, h } from "preact";
import style from "./Avatar.scss";

export enum AvatarStyle {
    Small,
    Big,
    Huge
}

export interface AvatarProps {
    color: string
    name: string
    style?: AvatarStyle
    onClick?: () => void
}

export class Avatar extends Component<AvatarProps, any> {
    render() {
        let styles = [`background-color: ${this.props.color}`]

        let klass = style.default

        switch(this.props.style) {
            case AvatarStyle.Big:
                klass = style.big
                break
            case AvatarStyle.Huge:
                klass = style.huge
                break
        }

        return <div class={klass} onClick={this.props.onClick} style={styles.join("; ")}>{this.props.name.substring(0, 1).toLocaleUpperCase()}</div>
    }
}