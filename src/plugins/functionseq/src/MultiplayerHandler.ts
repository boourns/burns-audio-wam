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
    
    userId: string
}

export class MultiplayerHandler {
    instanceId: string
    userState: MultiplayerState
    editor?: monaco.editor.ICodeEditor

    cursorManager?: MonacoCollabExt.RemoteCursorManager
    selectionManager?: MonacoCollabExt.RemoteSelectionManager
    contentManager: MonacoCollabExt.EditorContentManager

    cursors: Map<string, CursorState>

    constructor(instanceId: string) {
        this.instanceId = instanceId
        this.cursors = new Map()

        window.WAMExtensions.multiplayer.register(this.instanceId, {
            userListUpdated: (userState: MultiplayerState) => {
                this.userState = userState
            },
            receiveMessage: (userId: string, message: any) => {
                console.log("5 - Plugin received message ", message, ", from user ", userId)
                if (!this.userState) {
                    return
                }
                if (userId == this.userState.userId) {
                    return
                }

                switch (message.action) {
                    case "cursor":
                        this.updateCursor(userId, message.offset)

                        break
                    case "selection":
                        this.updateSelection(userId, message.start, message.end)

                        break
                    case "insert":
                        this.contentManager.insert(message.index, message.text)

                        break
                    case "replace":
                        this.contentManager.replace(message.index, message.length, message.text)

                        break
                    case "delete":
                        this.contentManager.delete(message.index, message.length)

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

        let instanceId = this.instanceId

        this.contentManager = new MonacoCollabExt.EditorContentManager({
            // @ts-ignore
            editor,
            onInsert(index, text) {
              //target.updateOptions({readOnly: false});

              window.WAMExtensions.multiplayer.broadcastMessage(instanceId, {action:"insert", index, text})

              //target.updateOptions({readOnly: true});
            },
            onReplace(index, length, text) {
              //target.updateOptions({readOnly: false});

              window.WAMExtensions.multiplayer.broadcastMessage(instanceId, {action:"replace", index, length, text})

              //target.updateOptions({readOnly: true});
            },
            onDelete(index, length) {
              //target.updateOptions({readOnly: false});

              window.WAMExtensions.multiplayer.broadcastMessage(instanceId, {action:"delete", index, length})

              //target.updateOptions({readOnly: true});
            }
          });

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

    deleteUserState(userId: string) {
        let cursor = this.cursors.get(userId)
        if (!cursor) {
            return
        }
        if (cursor.cursor) {
            this.cursorManager.removeCursor(cursor.cursor)
        }

        this.cursors.delete(userId)
    }

    updateCursor(userId: string, offset: number) {
        if (!this.cursors.has(userId)) {
            this.cursors.set(userId, {userId})
        }
        let cursor = this.cursors.get(userId)

        let user = this.userState.users.find(u => u.id == cursor.userId)
        if (!user) {
            this.deleteUserState(userId)
            return
        }

        if (!cursor.cursor) {
            cursor.cursor = this.cursorManager.addCursor(user.id, user.color, user.name);
        }

        this.selectionManager.removeSelection(userId)

        cursor.cursor.setOffset(offset)
    }

    updateSelection(userId: string, start: number, end: number) {
        if (!this.cursors.has(userId)) {
            this.cursors.set(userId, {userId})
        }
        let cursor = this.cursors.get(userId)

        let user = this.userState.users.find(u => u.id == cursor.userId)
        if (!user) {
            this.deleteUserState(userId)
            return
        }

        if (!cursor.selection) {
            cursor.selection = this.selectionManager.addSelection(user.id, user.color, user.name);
        }

        this.selectionManager.setSelectionOffsets(user.id, start, end)
    }




}