import { Component, h } from "preact";
import style from './Checkbox.scss';

export interface CheckboxProps {
    selected: boolean
    onClick: (v: boolean) => void
}

type CheckboxState = {

}

export class Checkbox extends Component<CheckboxProps, CheckboxState> {
    render() {
        return <input class={style.default} checked={this.props.selected} type="checkbox" onChange={e => {
            this.props.onClick(e.currentTarget.checked)
        }}></input>
    }
}