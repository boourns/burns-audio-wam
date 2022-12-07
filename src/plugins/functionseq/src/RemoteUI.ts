import { kernel } from "./globals"

export type RemoteUIElementProperties = {
    width?: number
    height?: number
    label?: string
    highlighted?: boolean
    padding?: number
    showValue?: boolean
}

export type RemoteUIElement = {
    type: "action" | "toggle" | "knob" | "slider" | "select" | "label" | "col" | "row"
    name: string
    props: RemoteUIElementProperties

    children?: RemoteUIElement[]
}

export namespace ui {
    export const Col = (name: string, children: RemoteUIElement[], properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "col",
            name,
            children,
            props: properties ?? {}
        }
    }

    export const Row = (name: string, children: RemoteUIElement[], properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "row",
            name,
            children,
            props: properties ?? {}
        }
    }

    export const Action = (name: string, properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type:"action",
            name,
            props: properties ?? {}
        }
    }

    export const Toggle = (name: string, properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "toggle",
            name,
            props: properties ?? {}
        }
    }

    export const Knob = (name: string, properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "knob",
            name,
            props: properties ?? {}
        }
    }

    export const Slider = (name: string, properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "slider",
            name,
            props: properties ?? {}
        }
    }

    export const Label = (name: string, properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "label",
            name,
            props: properties ?? {}
        }
    }

    export const Select = (name: string, properties?: RemoteUIElementProperties): RemoteUIElement => {
        return {
            type: "select",
            name,
            props: properties ?? {}
        }
    }

    export const Register = (root: RemoteUIElement) => {
        kernel.ui.register(root)
    }

    export const Highlight = (name: string, value: boolean) => {
        kernel.ui.highlight(name, value)
    }
}
