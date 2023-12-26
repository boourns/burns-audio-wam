import * as monaco from 'monaco-editor';

export class MonacoSinglePlayerBinding {
    editor: monaco.editor.ICodeEditor
    model: monaco.editor.ITextModel;
    _monacoChangeHandler: monaco.IDisposable;
    getSource: () => string
    setSource: (src: string) => void

    constructor(editor: monaco.editor.ICodeEditor, getSource: () => string, setSource: (src: string) => void) {
        this.editor = editor
        this.model = editor.getModel()!
        this.getSource = getSource
        this.setSource = setSource
    }

    attach() {
        this.model.setValue(this.getSource());
        this._monacoChangeHandler = this.model.onDidChangeContent(event => {
            this.setSource(this.model.getValue())
        })
    }

    detach() {
        this._monacoChangeHandler.dispose()
    }
}