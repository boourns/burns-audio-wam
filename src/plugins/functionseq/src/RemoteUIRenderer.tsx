import { WamParameterDataMap } from "@webaudiomodules/api";
import { Component, h } from "preact";
import { DynamicParamEntry, DynamicParameterNode } from "../../shared/DynamicParameterNode";
import { Knob } from "../../shared/ui/Knob";
import { Select } from "../../shared/ui/Select";
import { Slider } from "../../shared/ui/Slider"
import { Toggle } from "../../shared/ui/Toggle"

import { RemoteUIElement } from "./RemoteUI";
import { RemoteUIReceiver } from "./RemoteUIReceiver";

export interface RemoteUIRendererProps {
    plugin: DynamicParameterNode

    ui: RemoteUIReceiver
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
        if (element.props.width && element.props.height) {
            size = (element.props.width > element.props.height) ? element.props.height - 5 : element.props.width - 5
        }
        
        switch(p.config.type) {
            case "float":
                return <Knob onChange={(v) => this.valueChanged(p.id, v)} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             label={element.props.label}
                             value={() => this.getValue(p)}
                             bipolar={p.config.minValue < 0}
                             size={size}
                             showValue={element.props.showValue ?? false}
                             >
                        </Knob>
            case "int":
                return <Knob onChange={(v) => this.valueChanged(p.id, Math.round(v))} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             label={element.props.label}
                             value={() => this.getValue(p)}
                             bipolar={p.config.minValue < 0}
                             integer={true}
                             size={size}
                             showValue={element.props.showValue ?? false}
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
                             horizontal={element.props.horizontal ?? false}
                             label={element.props.label}
                             value={() => this.getValue(p)}
                             width={element.props.width}
                             height={element.props.height}
                             showValue={element.props.showValue}
                             color={() => this.props.ui.controlColour(p.id)}
                             >
                        </Slider>
            case "int":
                return <Slider onChange={(v) => this.valueChanged(p.id, Math.round(v))} 
                             minimumValue={p.config.minValue} 
                             maximumValue={p.config.maxValue}
                             horizontal={element.props.horizontal ?? false}
                             label={element.props.label}
                             width={element.props.width}
                             height={element.props.height}
                             value={() => this.getValue(p)}
                             showValue={element.props.showValue}
                             decimals={0}
                             color={() => this.props.ui.controlColour(p.id)}
                             >
                        </Slider>
            default:
                throw "Knob ui element must reference float or int parameter"
        }
    }

    renderToggle(element: RemoteUIElement, p: DynamicParamEntry) {
        switch(p.config.type) {
            case "boolean":
                return <Toggle onChange={(v) => this.valueChanged(p.id, v ? 1 : 0)} 
                             value={() => this.getValue(p) == 1}
                             width={element.props.width}
                             height={element.props.height}
                             color={() => this.props.ui.controlColour(p.id)}
                             label={element.props.label}
                             >
                        </Toggle>
            
            default:
                throw "Toggle ui element must reference boolean parameter"
        }
    }

    renderSelect(element: RemoteUIElement, p: DynamicParamEntry) {
        switch(p.config.type) {
            case "choice":
                return <Select onChange={(v) => this.valueChanged(p.id, parseInt(v))}
                             options={p.config.choices}
                             value={() => this.getValue(p) == 1}
                             label={element.props.label}
                             >
                        </Select>
            
            default:
                throw "Toggle ui element must reference parameter of type 'choice'"
        }
    }

    actionButtonPressed(name: string) {
        this.props.ui.dispatchAction(name)
    }

    renderActionButton(element: RemoteUIElement) {
        return <button onClick={() => this.actionButtonPressed(element.name)}>{element.props.label ?? element.name}</button>
    }

    paddingStyle(el: RemoteUIElement): string[] {
        let result = []
        if (el.props.padding !== undefined) {
            result.push(`padding: ${el.props.padding}px;`)
        } else {
            result.push(`padding: 5px;`)
        }
        return result
    }

    sizeStyles(el: RemoteUIElement): string[] {
        let result: string[] = []
        if (el.props.width !== undefined) {
            result.push(`width: ${el.props.width}px; min-width: ${el.props.width}px; max-width: ${el.props.width}px; overflow: hidden;`)
        } else {
            result.push("width: 100%;")
        }
        if (el.props.height !== undefined) {
            result.push(`height: ${el.props.height}px; min-height: ${el.props.height}px; max-height: ${el.props.height}px; overflow: hidden;`)
        } else {
            result.push("height: 100%;")
        }

        result.push(...this.paddingStyle(el))
        
        return result
    }

    renderElement(el: RemoteUIElement) {
        let style=this.sizeStyles(el)        
        try {
            switch (el.type) {
                case "col":
                    style.push("display: flex;", "flex-direction: column;", "justify-content: center;", "align-items: flex-start;")
    
                    return <div style={style.join(" ")}>{el.children.map(ch => this.renderElement(ch))}</div>
                case "row":
                    style.push("display: flex;", "flex-direction: row;", "justify-content: flex-start;", "align-items: center;")
    
                    return <div style={style.join(" ")}>{el.children.map(ch => this.renderElement(ch))}</div>
                case "knob":
                    const knobParam = this.props.plugin.findParameter(el.name)
                    if (!knobParam) {
                        throw "Failed to find parameter " + el.name
                    }
                    return <div style={this.paddingStyle(el).join(" ")}>{this.renderKnob(el, knobParam)}</div>
                case "slider":
                    const sliderParam = this.props.plugin.findParameter(el.name)
                    if (!sliderParam) {
                        throw "Failed to find parameter " + el.name
                    }
                    return <div style={this.paddingStyle(el).join(" ")}>{this.renderSlider(el, sliderParam)}</div>
                case "toggle":
                    const toggleParam = this.props.plugin.findParameter(el.name)
                    if (!toggleParam) {
                        throw "Failed to find parameter " + el.name
                    }
                    return <div style={this.paddingStyle(el).join(" ")}>{this.renderToggle(el, toggleParam)}</div>
                case "select":
                    const selectParam = this.props.plugin.findParameter(el.name)
                    if (!selectParam) {
                        throw "Failed to find parameter " + el.name
                    }
                    return <div style={style.join(" ")}>{this.renderSelect(el, selectParam)}</div>
                case "label":
                    return <div style={style.join(" ")}>{el.props.label ?? el.name}</div>
                case "action":
                    return <div style={style.join(" ")}>{this.renderActionButton(el)}</div>
             }
        } catch(e) {
            console.error(`Error rendering element ${el.name}: ${e}`)
        }
        
         return <div></div>
    }
    
    render() {
        let body
        try {
            body = this.renderElement(this.props.ui.ui)
        } catch (e) {
            body = <div style="background-color: red">{e}</div>
        }
        return body
    }
}