import { CollaborationDocumentInterface } from "wam-extensions";
import * as monaco from 'monaco-editor';
import { createMutex } from 'lib0/mutex'
import { CollaborationOperation } from "wam-extensions/dist/collaboration/CollaborationExtension";

export class MonacoMultiplayerBinding {
    editor: monaco.editor.ICodeEditor
    document: CollaborationDocumentInterface
    mux: any;
    model: monaco.editor.ITextModel;
    _monacoChangeHandler: monaco.IDisposable;

    decorations: string[]
    updating: number

    constructor(editor: monaco.editor.ICodeEditor, document: CollaborationDocumentInterface) {
        this.editor = editor
        this.model = editor.getModel()!
        this.document = document
        this.mux = createMutex()
        this.decorations = []
        this.updating = 0
    }

    async attach() {
        this.model.setValue(await this.document.toString())
        
        await this.document.observe(async (events: CollaborationOperation[]) => {
            const source = await this.document.toString()
      
            this.mux(() => {
                let index = 0

                events.forEach(op => {
                    if (op.operation == "INSERT") {
                        const pos = this.model.getPositionAt(op.position)
                        const range = new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
                        this.model.applyEdits([{ range, text: op.text }])
                    } else if (op.operation == "DELETE") {
                        const pos = this.model.getPositionAt(op.position)
                        const endPos = this.model.getPositionAt(op.position + op.length)
                        const range = new monaco.Selection(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column)
                        this.model.applyEdits([{ range, text: '' }])
                    }
                })

                const value = this.model.getValue()

                if (value !== source) {
                    console.warn("monaco and document do not match, hard reassign!")
                    this.model.setValue(source)
                }
            })

            this.rerenderDecorations()
        })

        this._monacoChangeHandler = this.model.onDidChangeContent(event => {
            // apply changes from right to left
            this.mux(async () => {
                let operations: CollaborationOperation[] = []
                
                event.changes.sort((change1, change2) => change2.rangeOffset - change1.rangeOffset).forEach(change => {
                    operations.push({
                        operation: "DELETE",
                        position: change.rangeOffset,
                        length: change.rangeLength
                    })
                    operations.push({
                        operation: "INSERT",
                        position: change.rangeOffset,
                        text: change.text
                    })
                })

                this.updating++

                await this.document.applyOperations(operations)
                this.updating--
            })
        })

        this.editor.onDidChangeCursorSelection(() => {
            if (this.editor.getModel() === this.model) {
                const sel = this.editor.getSelection()
                if (sel === null) {
                    return
                }
                let anchor = this.model.getOffsetAt(sel.getStartPosition())
                let head = this.model.getOffsetAt(sel.getEndPosition())
                if (sel.getDirection() === monaco.SelectionDirection.RTL) {
                    const tmp = anchor
                    anchor = head
                    head = tmp
                }

                this.document.updateSelection(anchor, head)
            }
        })
    }

    detach() {
        this._monacoChangeHandler.dispose()
        
        this.document.observe(undefined)
    }

    async rerenderDecorations() {
        let newDecorations: monaco.editor.IModelDeltaDecoration[] = []

        const selections = await this.document.selections()

        selections.forEach((selection, clientID) => {
            let start, end, afterContentClassName, beforeContentClassName
            if (selection.anchor < selection.head) {
                start = this.model.getPositionAt(selection.anchor)
                end = this.model.getPositionAt(selection.head)
                afterContentClassName = 'yRemoteSelectionHead yRemoteSelectionHead-' + clientID
                beforeContentClassName = null
            } else {
                start = this.model.getPositionAt(selection.head)
                end = this.model.getPositionAt(selection.anchor)
                afterContentClassName = null
                beforeContentClassName = 'yRemoteSelectionHead yRemoteSelectionHead-' + clientID
            }

            newDecorations.push({
                range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                options: {
                    className: 'yRemoteSelection yRemoteSelection-' + clientID,
                    afterContentClassName,
                    beforeContentClassName
                }
            })
        })

        this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations)
    }
    
    
}