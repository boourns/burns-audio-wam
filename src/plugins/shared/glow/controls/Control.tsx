import { Component, h } from "preact";
import { Label } from "./Label";
import style from "./Control.scss";

export interface ControlProps {
    label: string
}

export class Control extends Component<ControlProps, {}> {
    render() {
        return <div class={style.default}>
            <div class={style.LabelContainer}>
                <Label>{this.props.label}</Label>
            </div>
            <div class={style.ControlContainer}>
                {this.props.children}
            </div>
        </div>
    }
}
