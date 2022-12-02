import { WamParameterDataMap } from "@webaudiomodules/api";
import { Component, h } from "preact";
import { DynamicParamEntry, DynamicParameterNode } from "../../shared/DynamicParameterNode";
import { Knob } from "../../shared/ui/Knob";
import { Slider } from "../../shared/ui/Slider"
import { RemoteUIElement } from "./RemoteUI";

export interface RemoteUIRendererProps {
    plugin: DynamicParameterNode

    ui: RemoteUIElement
}

export class RemoteUIRenderer extends Component<RemoteUIRendererProps, any> {
    componentDidMount(): void {
        this.props.plugin.schemaUpdateCallback = () => {
            this.forceUpdate()
        }
    }

    componentWillUnmount(): void {
        this.props.plugin.schemaUpdateCallback = undefined
    }
    
    valueChanged(id: string, value: number) {
        this.props.plugin.pause = true

        this.props.plugin.state[id].value = value

        let update: WamParameterDataMap = {}
        update[id] = this.props.plugin.state[id]

        this.props.plugin.setParameterValues(update)
        this.props.plugin.pause = false
    }

    getValue(param: DynamicParamEntry) {
        if (this.props.plugin.state && this.props.plugin.state[param.id]) {
            let entry = this.props.plugin.state[param.id]
            if (entry.value !== undefined) {
                return entry.value
            }
        }

        return param.config.defaultValue
    }

    renderKnob(element: RemoteUIElement, p: DynamicParamEntry) {
        let size = 40
        if (element.width && element.height) {
            size = (element.width > element.height) ? element.height - 5 : element.width - 5
        }
        
        switch(p.config.type) {
            case "float":
                return <Knob onChange={(v) => this.valueChanged(p.id, v)} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.getValue(p)}
                             bipolar={p.config.minValue < 0}
                             size={size}
                             showValue={false}

                             >
                        </Knob>
            case "int":
                return <Knob onChange={(v) => this.valueChanged(p.id, Math.round(v))} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.getValue(p)}
                             bipolar={p.config.minValue < 0}
                             integer={true}
                             size={size}
                             showValue={false}

                             >
                        </Knob>
            default:
                throw "Knob ui element must reference float or int parameter"
        }
    }

    renderSlider(element: RemoteUIElement, p: DynamicParamEntry) {
        switch(p.config.type) {
            case "float":
                return <Slider onChange={(v) => this.valueChanged(p.id, v)} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             value={() => this.getValue(p)}
                             width={element.width}
                             height={element.height}
                             showValue={false}
                             >
                        </Slider>
            case "int":
                return <Slider onChange={(v) => this.valueChanged(p.id, Math.round(v))} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             width={element.width}
                             height={element.height}
                             value={() => this.getValue(p)}
                             showValue={false}
                             decimals={0}
                             >
                        </Slider>
            default:
                throw "Knob ui element must reference float or int parameter"
        }
    }
    

    sizeStyles(el: RemoteUIElement): string[] {
        let result: string[] = []
        if (el.width !== undefined) {
            result.push("width: ${el.width}px;")
        } else {
            result.push("width: 100%;")
        }
        if (el.height !== undefined) {
            result.push("height: ${el.height}px;")
        } else {
            result.push("height: 100%;")
        }
        return result
    }

    renderElement(el: RemoteUIElement) {
        let style=this.sizeStyles(el)

        console.log("renderElement ", el)

        switch (el.type) {
            case "col":
                style.push("display: flex;", "flex-direction: column;", "justify-content: center;", "align-items: center;")

                return <div style={style.join(" ")}>{el.children.map(ch => this.renderElement(ch))}</div>
            case "row":
                style.push("display: flex;", "flex-direction: row;", "justify-content: center;", "align-items: center;")

                return <div style={style.join(" ")}>{el.children.map(ch => this.renderElement(ch))}</div>
            case "knob":
                const knobParam = this.props.plugin.findParameter(el.name)
                if (!knobParam) {
                    throw "Failed to find parameter " + el.name
                }
                return this.renderKnob(el, knobParam)
            case "slider":
                const sliderParam = this.props.plugin.findParameter(el.name)
                if (!sliderParam) {
                    throw "Failed to find parameter " + el.name
                }
                return this.renderSlider(el, sliderParam)
            case "label":
                return <div style={style.join(" ")}>{el.label ?? el.name}</div>
         }

         return <div></div>
    }
    
    render() {
        let body
        try {
            body = this.renderElement(this.props.ui)
        } catch (e) {
            body = <div style="background-color: red">{e}</div>
        }
        return body
    }
}