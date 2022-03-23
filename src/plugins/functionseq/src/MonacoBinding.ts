import { CollaborationDocumentInterface } from "wam-extensions";
import * as monaco from 'monaco-editor';
import { createMutex } from 'lib0/mutex'

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
        this.document.onUpdate((event) => {
            this.mux(() => {
              let index = 0
              event.delta.forEach((op: any) => {
                if (op.retain !== undefined) {
                  index += op.retain
                } else if (op.insert !== undefined) {
                  const pos = this.model.getPositionAt(index)
                  const range = new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
                  this.model.applyEdits([{ range, text: op.insert }])
                  index += op.insert.length
                } else if (op.delete !== undefined) {
                  const pos = this.model.getPositionAt(index)
                  const endPos = this.model.getPositionAt(index + op.delete)
                  const range = new monaco.Selection(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column)
                  this.model.applyEdits([{ range, text: '' }])
                } else {
                  throw new Error("Unexpected event")
                }
              })

            //   this._savedSelections.forEach((rsel, editor) => {
            //     const sel = createMonacoSelectionFromRelativeSelection(editor, ytext, rsel, this.doc)
            //     if (sel !== null) {
            //       editor.setSelection(sel)
            //     }
            //   })

                // hard force check - necessary?
                const source = this.document.toString()

                if (this.model.getValue() !== source) {
                this.model.setValue(source)
                }
            })

            //this._rerenderDecorations()
          })

          this._monacoChangeHandler = this.model.onDidChangeContent(event => {
            // apply changes from right to left
            this.mux(() => {
                this.document.applyOperations()
                
              this.doc.transact(() => {
                event.changes.sort((change1, change2) => change2.rangeOffset - change1.rangeOffset).forEach(change => {
                  ytext.delete(change.rangeOffset, change.rangeLength)
                  ytext.insert(change.rangeOffset, change.text)
                })
              }, this)
            })
          })

    }

    detach() {
        this.document.onUpdate(undefined)
    }

    
}