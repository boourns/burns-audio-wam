// this class runs in the remote context, handling the client's ui perspective

import { FunctionKernel } from "./FunctionKernel"
import { RemoteUIElement } from "./RemoteUI"

export type RemoteUIUpdate = {
    t: string
    f: string
    v: any
}

export type RemoteUIExtendedState = {
    highlighted?: boolean
}

export class RemoteUIController {
    port: MessagePort
    ui?: RemoteUIElement
    uiMap: Record<string, RemoteUIExtendedState>
    kernel: FunctionKernel

    pendingUpdates: RemoteUIUpdate[]

    constructor(kernel: FunctionKernel, port: MessagePort) {
        this.kernel = kernel
        this.port = port
        this.pendingUpdates = []
    }

    register(root?: RemoteUIElement) {
        this.ui = root

        this.uiMap = {}

        if (this.ui) {
            const setMapValues = (el: RemoteUIElement) => {
                if (this.uiMap[el.name]) {
                    throw new Error(`UI has two elements named ${el.name}`)
                }

                this.uiMap[el.name] = {}
                if (el.children) {
                    for (let child of el.children) {
                        setMapValues(child)
                    }
                }
            }
            
            setMapValues(this.ui)
        }

        this.port.postMessage({source: "remoteUI", action:"ui", ui: root ? JSON.stringify(root) : undefined})
    }

    highlight(name: string, value: boolean) {
        try {
            if (this.uiMap[name].highlighted != value) {
                this.uiMap[name].highlighted = value
                this.pendingUpdates.push({t: "high", f: name, v: value})
            }
        } catch (e) {
            console.error(`error highlighting ${name}: ${e}`)
        }
    }

    flush() {
        const updates = this.pendingUpdates
        this.pendingUpdates = []
        if (updates.length > 0) {
            this.port.postMessage({source:"remoteUI", action:"up", updates})
        }
    }
    
    onMessage(message: any) {
        if (!message.data || message.data.source != "remoteUI") {
            return
        }
        if (message.data.action == "action" && message.data.name) {
            this.kernel.onAction(message.data.name)
        }
    }
}