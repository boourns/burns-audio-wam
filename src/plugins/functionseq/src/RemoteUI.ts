import {kernel} from "./FunctionAPI"

export type RemoteUIElement = {
    type: "action" | "toggle" | "knob" | "slider" | "label" | "col" | "row"
    name: string
    width?: number
    height?: number
    label?: string
    children?: RemoteUIElement[]
    highlighted?: boolean
}

export namespace ui {
    export const Col = (name: string, children: RemoteUIElement[], width?: number, height?: number): RemoteUIElement => {
        return {
            type: "col",
            name,
            children,
            width,
            height
        }
    }

    export const Row = (name: string, children: RemoteUIElement[], width?: number, height?: number): RemoteUIElement => {
        return {
            type: "row",
            name,
            children,
            width,
            height
        }
    }

    export const Action = (name: string, width?: number, height?: number): RemoteUIElement => {
        return {
            type:"action",
            name,
            width,
            height
        }
    }

    export const Toggle = (name: string, width?: number, height?: number): RemoteUIElement => {
        return {
            type: "toggle",
            name,
            width,
            height
        }
    }

    export const Knob = (name: string, width?: number, height?: number): RemoteUIElement => {
        return {
            type: "knob",
            name,
            width,
            height
        }
    }

    export const Slider = (name: string, width?: number, height?: number): RemoteUIElement => {
        return {
            type: "slider",
            name,
            width,
            height
        }
    }

    export const Label = (name: string, label: string, width?: number, height?: number): RemoteUIElement => {
        return {
            type: "label",
            label,
            name,
            width,
            height
        }
    }

    export const Register = (root: RemoteUIElement) => {
        kernel.registerUI(root)
    }

    export const Highlight = (name: string, value: boolean) = {
        kernel.highlightUIElement(name, value)
    }


}