export type PatternEntry = {
    id: string
    name: string
}

export type PatternDelegate = {
    getPatternList: () => PatternEntry[]
    createPattern: (id: string) => void
    deletePattern: (id: string) => void
    playPattern: (id: string | undefined) => void
    getPatternState: (id: string) => any
    setPatternState: (id: string, state: any) => any
}

export class PatternExtension {
    delegates: Map<string, PatternDelegate>

    constructor() {
        this.delegates = new Map()
    }

    setPatternDelegate(pluginId: string, delegate?: PatternDelegate) {
        if (delegate) {
            this.delegates.set(pluginId, delegate)
        } else {
            this.delegates.delete(pluginId)
        }
    }

    getPatternViewDelegate(pluginId: string): PatternDelegate | undefined{
        return this.delegates.get(pluginId)
    }
}