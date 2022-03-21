import {MultiplayerState} from "wam-extensions"
import * as Y from 'yjs'
import * as monaco from 'monaco-editor';
import { SequencerPartyProvider } from "./yjs-SequencerParty";

export class MultiplayerHandler {
    instanceId: string
    userState: MultiplayerState
    editor?: monaco.editor.ICodeEditor
    provider: SequencerPartyProvider

    constructor(instanceId: string) {
        this.instanceId = instanceId

        const doc = new Y.Doc()
        this.provider = new SequencerPartyProvider(this, 'my-roomname', doc)

        this.provider.on('status', (event: any) => {
            console.log(event.status) // logs "connected" or "disconnected"
        })

        window.WAMExtensions.multiplayer.register(this.instanceId, {
            userListUpdated: (userState: MultiplayerState) => {
                this.userState = userState
            },
            receiveMessage: (userId: string, message: any) => {
                if (!this.userState) {
                    return
                }
                if (userId == this.userState.userId) {
                    return
                }
                console.log("<=== Rx: length ", message.length, " message ", message)

                this.provider.onMessage(message)
            },
            onConnect: () => {
            },
            onDisconnect: () => {
                this.provider.onClose("disconnected")
            },
        })

        this.provider.onOpen()

    }

    registerEditor(editor: monaco.editor.ICodeEditor) {
        this.editor = editor

        this.createFirepad()
    }

    createFirepad() {
        if (!this.editor || !this.userState) {
            return
        }

        let user = this.userState.users.find(u => u.id == this.userState.userId)
        if (!user) {
            console.error(`Have userID ${this.userState.userId} but no user state?`)
            return
        }
    }

    unregisterEditor() {
        this.editor = undefined
    }
    
    send(message: any) {
        console.log("===> Tx: length ", message.length, " message ", message)
        window.WAMExtensions.multiplayer.broadcastMessage(this.instanceId, Array.from(message))
    }

    close() {
        console.error("YJS handler requested to close connection")
    }

}