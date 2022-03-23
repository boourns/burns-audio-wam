import { CollaborationDocumentInterface } from "wam-extensions";
import * as monaco from 'monaco-editor';
import { createMutex } from 'lib0/mutex'
import { CollaborationOperation } from "wam-extensions/dist/collaboration/CollaborationExtension";

export class MonacoBinding {
    editor: monaco.editor.ICodeEditor
    document: CollaborationDocumentInterface
    mux: any;
    model: monaco.editor.ITextModel;
    _monacoChangeHandler: monaco.IDisposable;

    constructor(editor: monaco.editor.ICodeEditor, document: CollaborationDocumentInterface) {
        this.editor = editor
        this.model = editor.getModel()
        this.document = document
        this.mux = createMutex()
    }

    attach() {
        console.log("MonacoBinding.attach()")
        this.document.onUpdate((events: CollaborationOperation[]) => {
            this.mux(() => {
                console.log("MonacoBinding: onUpdate")
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

                const source = this.document.toString()

                if (this.model.getValue() !== source) {
                    console.warn("TOM: monaco and document do not match, hard fixing!")
                    this.model.setValue(source)
                }
            })

            //this._rerenderDecorations()
          })

            this._monacoChangeHandler = this.model.onDidChangeContent(event => {
                console.log("monacoChangeHandler")
                // apply changes from right to left

                this.mux(() => {
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

                    this.document.applyOperations(operations)
                })
            })

    }

    detach() {
        this._monacoChangeHandler.dispose()
        
        this.document.onUpdate(undefined)
    }

    
}