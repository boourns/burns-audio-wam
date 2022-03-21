import {MultiplayerState} from "wam-extensions"

import * as monaco from 'monaco-editor';
import Firepad, { IDatabaseAdapter, IEditorAdapter, IFirepadConstructorOptions, MonacoAdapter } from "@hackerrank/firepad";

type CursorState = {    
    userId: string
}

export class MultiplayerHandler {
    instanceId: string
    userState: MultiplayerState
    editor?: monaco.editor.ICodeEditor

    cursors: Map<string, CursorState>

    constructor(instanceId: string) {
        this.instanceId = instanceId
        this.cursors = new Map()

        window.WAMExtensions.multiplayer.register(this.instanceId, {
            userListUpdated: (userState: MultiplayerState) => {
                this.userState = userState

                this.createFirepad()
            },
            receiveMessage: (userId: string, message: any) => {
                if (!this.userState) {
                    return
                }
                if (userId == this.userState.userId) {
                    return
                }

                // switch (message.action) {
                //     case "cursor":
                //         this.updateCursor(userId, message.offset)

                //         break
                   
                //     default:
                //         console.error("Unknown custom message to plugin: ", message)
                // }
                
            }
        })
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

        const databaseAdapter: IDatabaseAdapter = ...; // Database Adapter instance

        const options: IFirepadConstructorOptions = {
            /** Unique Identifier for current User */
            userId: user.id,
            /** Unique Hexadecimal color code for current User */
            userColor: user.color,
            /** Name/Short Name of the current User (optional) */
            userName: user.name // string
        };

        // @ts-ignore
        const editorAdapter = new MonacoAdapter(this.editor, false)

        const firepad = new Firepad(databaseAdapter, editorAdapter, options)
    }

    unregisterEditor() {
        this.editor = undefined
    }

}