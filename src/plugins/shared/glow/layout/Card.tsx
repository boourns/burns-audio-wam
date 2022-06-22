import { Component, h } from "preact";
import styles from "./Card.scss";

export interface CardProps {
    icon: h.JSX.Element
    title: h.JSX.Element | string
    leftAccessory?: h.JSX.Element
    rightAccessory?: h.JSX.Element
}

export class Card extends Component<CardProps, any> {
    render() {
        return <div class={styles.CardContainer}>
            <div class={styles.CardBody}>
                {this.props.leftAccessory &&
                <div class={styles.Accessory}>
                    {this.props.leftAccessory}
                </div>
                }
                <div class={styles.Icon}>
                    {this.props.icon}
                </div>
                <div class={styles.Content}>
                    <div style={styles.Header}>{this.props.title}</div>
                    {this.props.children}
                </div>
                {this.props.rightAccessory &&
                <div class={styles.Accessory}>
                    {this.props.rightAccessory}
                </div>
                }
            </div>
        </div>
    }
}
