import * as monaco from 'monaco-editor';
import { CollaborationDocumentInterface, CollaborationExtension } from 'wam-extensions';
import { MonacoBinding } from './MonacoBinding';

export class MultiplayerHandler {
    documentId: string
    instanceId: string
    editor?: monaco.editor.ICodeEditor
    doc: CollaborationDocumentInterface
    binding: MonacoBinding

    constructor(instanceId: string, docId: string) {
        this.instanceId = instanceId
        this.documentId = docId

        if (!window.WAMExtensions.collaboration) {
            console.error("MultiplayerHandler requires host implement Collaboration Extension")
            return
        }        
    }

    async getDocumentFromHost() {
        console.log("getDocumentFromHost")
        let doc = window.WAMExtensions.collaboration.getDocument(this.instanceId, this.documentId)

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

        console.log("attachEditor")

        this.binding = new MonacoBinding(this.editor, this.doc)
        this.binding.attach()
    }

    unregisterEditor() {
        this.binding.detach()
        this.editor = undefined
    }
}