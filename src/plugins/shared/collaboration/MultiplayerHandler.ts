import * as monaco from 'monaco-editor';
import { CollaborationDocumentInterface, CollaborationExtension } from 'wam-extensions';
import { MonacoBinding } from './MonacoBinding';

export type MultiplayerEditorError = {
    message: string
    line: number
}

export class MultiplayerHandler {
    label: string
    documentId: string
    instanceId: string
    editor?: monaco.editor.ICodeEditor
    doc: CollaborationDocumentInterface
    binding?: MonacoBinding
    error?: MultiplayerEditorError

    constructor(instanceId: string, docId: string, label: string) {
        this.instanceId = instanceId
        this.documentId = docId
        this.label = label

        if (!window.WAMExtensions.collaboration) {
            console.error("MultiplayerHandler requires host implement Collaboration Extension")
            return
        }        
    }

    async getDocumentFromHost(initialContent: string) {
        let doc = await window.WAMExtensions.collaboration!.getDocument!(this.instanceId, this.documentId, initialContent)

        this.doc = doc
        this.attachEditor()
    }

    registerEditor(editor: monaco.editor.ICodeEditor) {
        this.editor = editor

        this.attachEditor()
    }

    attachEditor() {
        if (!this.editor || !this.doc) {
            return
        }

        this.binding = new MonacoBinding(this.editor, this.doc)
        this.binding.attach()
        this.updateModelMarkers()
    }

    unregisterEditor() {
        if (this.binding) {
            this.binding.detach()
        }
        
        this.editor = undefined
        this.binding = undefined
    }

    setError(error: MultiplayerEditorError | undefined) {
        this.error = error

        this.updateModelMarkers()
    }

    updateModelMarkers() {
        let markers: monaco.editor.IMarkerData[] = []

        if (this.binding && this.binding.model) {
            if (this.error) {
                markers.push({
                    startLineNumber: this.error.line,
                    startColumn: 0,
                    endLineNumber: this.error.line,
                    endColumn: 100,
                    message: this.error.message,
                    severity: monaco.MarkerSeverity.Error
                })
            }
            
            monaco.editor.setModelMarkers(this.binding.model, "owner", markers);
        }
    }
}