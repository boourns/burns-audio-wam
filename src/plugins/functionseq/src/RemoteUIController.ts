// this class runs in the remote context, handling the client's ui perspective

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

    pendingUpdates: RemoteUIUpdate[]

    constructor(port: MessagePort) {
        this.port = port
        this.pendingUpdates = []
    }

    register(root?: RemoteUIElement) {
        console.log("Kernel registerUI: ", root)
        this.ui = root

        this.uiMap = {}

        if (this.ui) {
            const setMapValues = (el: RemoteUIElement) => {
                if (this.uiMap[el.name]) {
                    throw `UI has two elements named ${el.name}`
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
        console.log("message has been sent")
    }

    highlight(name: string, value: boolean) {
        if (this.uiMap[name].highlighted != value) {
            this.uiMap[name].highlighted = value
            this.pendingUpdates.push({t: "high", f: name, v: value})
        }
    }

    flush() {
        const updates = this.pendingUpdates
        this.pendingUpdates = []
        if (updates.length > 0) {
            this.port.postMessage({source:"remoteUI", action:"up", updates})
        }
    }
}