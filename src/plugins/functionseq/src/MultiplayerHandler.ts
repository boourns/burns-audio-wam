import {MultiplayerState} from "wam-extensions"

import * as monaco from 'monaco-editor';
import * as MonacoCollabExt from "@convergencelabs/monaco-collab-ext"

type SelectionOffset = {
    start: number
    end: number
}

type CursorState = {
    cursor?: any
    selection?: any
    
    cursorOffset?: number
    selectionOffset?: SelectionOffset

    userId: string
    delete?: boolean
}

export class MultiplayerHandler {
    instanceId: string
    userState: MultiplayerState
    editor?: monaco.editor.ICodeEditor

    cursorManager?: MonacoCollabExt.RemoteCursorManager
    selectionManager?: MonacoCollabExt.RemoteSelectionManager

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
                    case "selection":
                        this.updateSelection(userId, message.start, message.end)
                        break
                    default:
                        console.error("Unknown custom message to plugin: ", message)
                }
                
            }
        })
    }

    registerEditor(editor: monaco.editor.ICodeEditor) {
        this.editor = editor
        this.cursorManager = new MonacoCollabExt.RemoteCursorManager({
            // @ts-ignore
            editor: editor,
            tooltips: true,
            tooltipDuration: 2
        });

        // @ts-ignore
        this.selectionManager = new MonacoCollabExt.RemoteSelectionManager({editor})

        this.editor.onDidChangeCursorPosition((e: any) => {
            const offset = this.editor.getModel().getOffsetAt(e.position);
            
            window.WAMExtensions.multiplayer.broadcastMessage(this.instanceId, {action:"cursor", offset: offset})
        });

        this.editor.onDidChangeCursorSelection(e => {
            const startOffset = this.editor.getModel().getOffsetAt(e.selection.getStartPosition());
            const endOffset = this.editor.getModel().getOffsetAt(e.selection.getEndPosition());

            window.WAMExtensions.multiplayer.broadcastMessage(this.instanceId, {action:"selection", start:startOffset, end: endOffset})
        });
    }

    unregisterEditor() {
        this.editor = undefined
    }

    syncToEditor() {
        if (!this.editor || !this.cursorManager) {
            return
        }

        for (let cursor of this.cursors) {
            let user = this.userState.users.find(u => u.id == cursor.userId)

            if (!user || !cursor.cursorOffset) {
                cursor.delete = true
                if (cursor.cursor) {
                    this.cursorManager.removeCursor(user.id)
                }
            } else {
                if (user.id == this.userState.userId) {
                    continue
                }
                if (!cursor.cursor) {
                    cursor.cursor = this.cursorManager.addCursor(user.id, user.color, user.name);
                }
                if (cursor.cursorOffset) {
                    cursor.cursor.setOffset(cursor.cursorOffset);
                } else {
                    this.cursorManager.hideCursor(user.id)
                }

                if (!cursor.selection) {
                    cursor.selection = this.selectionManager.addSelection(user.id, user.color, user.name);
                }

                if (cursor.selectionOffset) {
                    this.selectionManager.setSelectionOffsets(user.id, cursor.selectionOffset.start, cursor.selectionOffset.end)
                } else {
                    this.selectionManager.hideSelection(user.id)
                }



            }

            this.cursors = this.cursors.filter(c => !c.delete)
        }
    }

    updateCursor(userId: string, offset: number) {
        let existing = this.cursors.find(c => c.userId == userId)
        if (!existing) {
            console.log("pushing new cursor for ", userId)
            this.cursors.push({userId, cursorOffset: offset})
        } else {
            existing.cursorOffset = offset
        }

        this.syncToEditor()
    }

    updateSelection(userId: string, start: number, end: number) {
        let existing = this.cursors.find(c => c.userId == userId)
        if (!existing) {
            console.log("pushing new cursor for ", userId)
            this.cursors.push({userId, selectionOffset: {start, end}})
        } else {
            existing.selectionOffset = {start, end}
        }

        this.syncToEditor()
    }




}