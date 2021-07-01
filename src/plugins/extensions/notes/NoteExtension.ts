export type NoteDefinition = {
    number: number
    name?: string
    blackKey: boolean
}

export type NoteListenerCallback = (notes: NoteDefinition[] | undefined) => void

export class NoteExtension {
    noteDefinitions: Map<string, NoteDefinition[]>
    listeners: Map<string, NoteListenerCallback>
    pluginMapping: Map<string, string[]>

    constructor() {
        this.noteDefinitions = new Map()
        this.listeners = new Map()
        this.pluginMapping = new Map()
    }

    setNoteList(pluginId: string, notes?: NoteDefinition[]) {
        if (notes) {
            this.noteDefinitions.set(pluginId, notes)
        } else {
            this.noteDefinitions.delete(pluginId)
        }
        this.sendNoteLists()
    }

    addListener(pluginId: string, callback?: NoteListenerCallback) {
        if (callback) {
            this.listeners.set(pluginId, callback)
        } else {
            this.listeners.delete(pluginId)
        }
        this.sendNoteLists()
    }

    addMapping(destinationId: string, sourceIds?: string[]) {
        if (sourceIds) {
            this.pluginMapping.set(destinationId, sourceIds)
        } else {
            this.pluginMapping.delete(destinationId)
        }
        this.sendNoteLists()
    }

    clearMapping() {
        this.pluginMapping.clear()
    }

    sendNoteLists() {
        this.pluginMapping.forEach((sourceIds: string[], destinationId: string) => {
            let callback = this.listeners.get(destinationId)
            if (callback) {
                let noteListId = sourceIds.find((id) => this.noteDefinitions.has(id))
                if (noteListId) {
                    callback(this.noteDefinitions.get(noteListId))
                } else {
                    callback(undefined)
                }
            }
        })
    }
}