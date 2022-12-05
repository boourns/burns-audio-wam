// This is the host-thread side of RemoteUI.  Names are terrible.

import { RemoteUIElement } from "./RemoteUI";
import { RemoteUIExtendedState } from "./RemoteUIController";

export class RemoteUIReceiver {
    ui: RemoteUIElement
    uiMap: Record<string, RemoteUIExtendedState>
    port: MessagePort

    constructor(port: MessagePort) {
        this.port = port
    }

    onMessage(message: any): boolean {
        if (message.data.source != "remoteUI") {
            return false
        }

        if (message.data.action == "ui") {
            if (message.data.ui) {
                this.ui = JSON.parse(message.data.ui)
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
            } else {
                this.ui = undefined
            }
            return true
        } else if (message.data.action == "up") {
            for (let update of message.data.updates) {
                
                if (update.t == "high") {
                    if (this.uiMap[update.f]) {
                        this.uiMap[update.f].highlighted = update.v
                    }
                }
            }
        }
        return false
    }

    controlColour(name: string): string {
        const el = this.uiMap[name]
        if (!el) {
            return "gray"
        }
        return el.highlighted ? "blue" : "yellow"
    }
}