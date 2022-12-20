import { FunctionKernel } from "./FunctionKernel"

export type RemoteUIElementProperties = {
    width?: number
    height?: number
    label?: string
    highlighted?: boolean
    padding?: number
    showValue?: boolean
    horizontal?: boolean
    centered?: boolean
}

export type RemoteUIElement = {
    type: "action" | "toggle" | "knob" | "slider" | "select" | "label" | "col" | "row"
    name: string
    props: RemoteUIElementProperties

    children?: RemoteUIElement[]
}

export class RemoteUI {
    #kernel: FunctionKernel
    constructor(kernel: FunctionKernel) {
        this.#kernel = kernel
    }

    Col(name: string, children: RemoteUIElement[], properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "col",
            name,
            children,
            props: properties ?? {}
        }
    }

    Row(name: string, children: RemoteUIElement[], properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "row",
            name,
            children,
            props: properties ?? {}
        }
    }

    Action(name: string, properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type:"action",
            name,
            props: properties ?? {}
        }
    }

    Toggle(name: string, properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "toggle",
            name,
            props: properties ?? {}
        }
    }

    Knob(name: string, properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "knob",
            name,
            props: properties ?? {}
        }
    }

    Slider(name: string, properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "slider",
            name,
            props: properties ?? {}
        }
    }

    Label(name: string, properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "label",
            name,
            props: properties ?? {}
        }
    }

    Select(name: string, properties?: RemoteUIElementProperties): RemoteUIElement {
        return {
            type: "select",
            name,
            props: properties ?? {}
        }
    }

    Highlight(name: string, value: boolean) {
        this.#kernel.uiController.highlight(name, value)
    }
}
