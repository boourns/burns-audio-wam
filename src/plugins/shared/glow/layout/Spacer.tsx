import { Component, h, toChildArray } from "preact";

export interface SpacerProps {
    top?: string
    left?: string
    bottom?: string
    right?: string
    between?: string
    vertical?: boolean
    center?: boolean
}

export class Spacer extends Component<SpacerProps, {}> {
    render() {
        let childs = toChildArray(this.props.children).map((c) => <div style={`padding: 0px ${this.props.between ?? "2px"};`}>{c}</div>)

        let container = ["display: flex", (this.props.vertical ? "flex-direction: column" : "flex-direction: row")]
        
        if (this.props.center) {
            container.push("align-items: center")
            container.push("justify-content: center")
        }
        
        if (this.props.top) container.push(`margin-top: ${this.props.top}`)
        if (this.props.bottom) container.push(`margin-bottom: ${this.props.bottom}`)
        if (this.props.left) container.push(`margin-left: ${this.props.left}`)
        if (this.props.right) container.push(`margin-right: ${this.props.right}`)

        return <div style={container.join("; ")}>
            {childs}
        </div>
    }
}
