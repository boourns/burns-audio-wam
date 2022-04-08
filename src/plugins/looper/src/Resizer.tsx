import { Component, h } from "preact";

export interface ResizerProps {
    vertical?: boolean
    resize: (width: number, height: number) => void
    finished: () => void
}

export class Resizer extends Component<ResizerProps, any> {
    parent?: HTMLDivElement      

    constructor() {
        super()

        this.resizeMoveHandler = this.resizeMoveHandler.bind(this)
        this.resizeUpHandler = this.resizeUpHandler.bind(this)
    }

    componentWillUnmount() {
        window.removeEventListener("mousemove", this.resizeMoveHandler)
        window.removeEventListener("mouseup", this.resizeUpHandler)
    }

    async resizeMoveHandler(e: MouseEvent) {
        let width = (this.props.vertical == true) ? this.parent!.getBoundingClientRect().left : e.pageX - this.parent!.getBoundingClientRect().left;
        let height = e.pageY - this.parent!.getBoundingClientRect().top;

        this.props.resize(width, height)
    }

    async resizeUpHandler(e: MouseEvent) {
        document.body.style.cursor = "default";
        
        this.props.finished()

        window.removeEventListener("mousemove", this.resizeMoveHandler)
        window.removeEventListener("mouseup", this.resizeUpHandler)
    }

    resizeMouseDown(evt: MouseEvent) {
        if (!evt.target) {
          return
        }

        this.parent = ((evt.target as HTMLDivElement).parentNode as HTMLDivElement)
        if (!this.parent) {
          return
        }

        if (this.props.vertical) {
            document.body.style.cursor = "ns-resize";
        } else {
            document.body.style.cursor = "nwse-resize";
        }

        this.props.resize(this.parent.clientWidth, this.parent.clientHeight)

        window.addEventListener("mousemove", this.resizeMoveHandler)
        window.addEventListener("mouseup", this.resizeUpHandler)
    }

    render() {
        if (this.props.vertical) {
            return <div style="background-color: rgba(107, 114, 128, 100); width: 100%; height: 8px; cursor: ns-resize;" onMouseDown={(e) => this.resizeMouseDown(e)}></div>
        } else {
            return <div style="position: absolute; bottom: 0px; right: 0px; background-color: rgba(107, 114, 128, 100); width: 8px; height: 8px; cursor: nwse-resize;" onMouseDown={(e) => this.resizeMouseDown(e)}></div>
        }
    }
}