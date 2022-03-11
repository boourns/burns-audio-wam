import {MultiplayerState} from "wam-extensions"

import * as monaco from 'monaco-editor';
import * as MonacoCollabExt from "@convergencelabs/monaco-collab-ext"

type CursorState = {
    editorCursor?: any
    offset: number
    userId: string
    delete?: boolean
}

export class MultiplayerHandler {
    instanceId: string
    userState: MultiplayerState
    editor?: monaco.editor.ICodeEditor

    cursorManager?: MonacoCollabExt.RemoteCursorManager

    cursors: CursorState[]

    constructor(instanceId: string) {
        this.instanceId = instanceId
        this.cursors = []

        window.WAMExtensions.multiplayer.register(this.instanceId, {
            userListUpdated: (userState: MultiplayerState) => {
                this.userState = userState
            },
            receiveMessage: (userId: string, message: any) => {
                console.log("5 - Plugin received message ", message, ", from user ", userId)
                switch (message.action) {
                    case "cursor":
                        this.updateCursor(userId, message.offset)
                        break
                    default:
                        console.error("Unknown custom message to plugin: ", message)
                }
                
            }
        })
    }

    registerEditor(editor: monaco.editor.ICodeEditor) {
        const remoteCursorManager = new MonacoCollabExt.RemoteCursorManager({
            // @ts-ignore
            editor: editor,
            tooltips: true,
            tooltipDuration: 2
        });

        this.editor = editor

        this.editor.onDidChangeCursorPosition((e: any) => {
            const offset = this.editor.getModel().getOffsetAt(e.position);
            
            if (window.WAMExtensions.multiplayer) {              
              window.WAMExtensions.multiplayer.broadcastMessage(this.instanceId, {action:"cursor", offset: offset})
            }
        });
    }

    unregisterEditor() {
        this.editor = undefined
    }

    syncCursorsToEditor() {
        if (!this.editor || !this.cursorManager) {
            return
        }

        for (let cursor of this.cursors) {
            let user = this.userState.users.find(u => u.id == cursor.userId)
            if (!user) {
                cursor.delete = true
            } else {
                if (!cursor.editorCursor) {
                    cursor.editorCursor = this.cursorManager.addCursor(user.id, user.color, user.name);
                }
                cursor.editorCursor.setOffset(cursor.offset);
            }

            this.cursors = this.cursors.filter(c => !c.delete)
        }
    }

    updateCursor(userId: string, offset: number) {
        let existing = this.cursors.find(c => c.userId == userId)
        if (!existing) {
            this.cursors.push({userId, offset})
        } else {
            existing.offset = offset
        }

        this.syncCursorsToEditor()
    }


}