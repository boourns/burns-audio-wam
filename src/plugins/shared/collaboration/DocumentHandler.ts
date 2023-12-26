import * as monaco from 'monaco-editor';
import { CollaborationDocumentInterface, CollaborationExtension } from 'wam-extensions';
import { MonacoMultiplayerBinding } from './MonacoMultiplayerBinding';
import { MonacoSinglePlayerBinding } from './MonacoSinglePlayerBinding';

export type MultiplayerEditorError = {
    message: string
    line: number
}

export class DocumentHandler {
    label: string
    documentId: string
    instanceId: string
    editor?: monaco.editor.ICodeEditor
    _doc?: CollaborationDocumentInterface // only set if host supports collaboration document extension
    binding?: MonacoMultiplayerBinding | MonacoSinglePlayerBinding
    error?: MultiplayerEditorError

    singlePlayerDocumentSource?: string
    documentInitialized = false

    constructor(instanceId: string, docId: string, label: string) {
        this.instanceId = instanceId
        this.documentId = docId
        this.label = label
    }

    async getDocumentFromHost(initialContent: string) {
        if (window.WAMExtensions && window.WAMExtensions.collaboration) {
            let doc = await window.WAMExtensions.collaboration!.getDocument!(this.instanceId, this.documentId, initialContent)

            this._doc = doc
        } else {
            this.singlePlayerDocumentSource = initialContent
        }

        this.documentInitialized = true

        this.attachEditor()
    }

    registerEditor(editor: monaco.editor.ICodeEditor) {
        this.editor = editor

        this.attachEditor()
    }

    attachEditor() {
        if (!this.editor || !this.documentInitialized) {
            return
        }

        if (this._doc) {
            this.binding = new MonacoMultiplayerBinding(this.editor, this._doc)
        } else {
            this.binding = new MonacoSinglePlayerBinding(this.editor, () => {
                return this.singlePlayerDocumentSource || ""
            },
            (source: string) => {
                this.singlePlayerDocumentSource = source
            })
        }
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

    async toString() {
        if (this._doc) {
            return await this._doc.toString()
        }

        return this.singlePlayerDocumentSource
    }

    setSinglePlayerDocumentSource(source: string) {
        this.singlePlayerDocumentSource = source
        if (this.binding && this.binding.model) {
            this.binding.model.setValue(source)
        }
    }
}