export class ThemeUpdateListener {
    roots: Map<string, ShadowRoot>

    constructor() {
        this.roots = new Map()
    }

    register(pluginId: string) {
        if (window.WAMExtensions?.theme) {
            window.WAMExtensions.theme.addListener(pluginId, (theme: string) => this.apply(theme))
        }
    }

    addTarget(nonce: string, root: ShadowRoot) {
        this.roots.set(nonce, root)
    }

    removeTarget(nonce: string) {
        this.roots.delete(nonce)
    }

    apply(theme: string) {
        for (let r of this.roots.values()) {
            r.querySelector(":root")?.setAttribute("style", theme)
        }
    }
    
}