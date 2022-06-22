import { Component, h } from "preact";
import styles from "./Spinner.scss";

export interface SpinnerProps {
    size: number
}

export class Spinner extends Component<SpinnerProps, any> {

    render() {
        return <div class={styles.spinner} style={`height: ${this.props.size}px; width: ${this.props.size}px;` }>
            <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        </div>
    }
}