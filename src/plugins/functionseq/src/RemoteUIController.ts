// this class runs in the remote context, handling the client's ui perspective

import { RemoteUIElement } from "./RemoteUI"

export type RemoteUIUpdate = {
    t: string
    f: string
    v: any
}

export class RemoteUIController {
    port: MessagePort

    ui?: RemoteUIElement
    uiMap: Record<string, RemoteUIElement>

    pendingUpdates: RemoteUIUpdate[]

    constructor(port: MessagePort) {
        this.port = port
    }

    register(root?: RemoteUIElement) {
        console.log("Kernel registerUI: ", root)
        this.ui = root

        if (this.ui) {
            this.uiMap = {}
        }

        this.port.postMessage({source: "remoteUI", action:"ui", ui: root ? JSON.stringify(root) : undefined})
    }

}