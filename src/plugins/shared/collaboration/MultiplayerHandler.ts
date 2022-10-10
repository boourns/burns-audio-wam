import * as monaco from 'monaco-editor';
import { CollaborationDocumentInterface, CollaborationExtension } from 'wam-extensions';
import { MonacoBinding } from './MonacoBinding';

export class MultiplayerHandler {
    label: string
    documentId: string
    instanceId: string
    editor?: monaco.editor.ICodeEditor
    doc: CollaborationDocumentInterface
    binding: MonacoBinding

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
        let doc = window.WAMExtensions.collaboration.getDocument(this.instanceId, this.documentId, initialContent)

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
    }

    unregisterEditor() {
        if (this.binding) {
            this.binding.detach()
        }
        
        this.editor = undefined
        this.binding = undefined
    }
}