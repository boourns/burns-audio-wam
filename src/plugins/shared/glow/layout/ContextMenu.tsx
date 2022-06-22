import style from './ContextMenu.scss'

export type ContextMenuAction = {
    title: string
    style?: string
    action: (el: HTMLElement) => void
}

export type ContextMenuDelegateType = (el: HTMLElement) => ContextMenuAction[] | undefined

export class ContextMenu {
    element?: HTMLElement
    contextMenuDelegate: ContextMenuDelegateType

    constructor(contextMenuDelegate: ContextMenuDelegateType) {
        this.render = this.render.bind(this)
        this.contextMenuDelegate = contextMenuDelegate
    }

    setTarget(el: HTMLElement) {
        this.clearTarget()
        this.element = el
        el.addEventListener("contextmenu", this.render)
    }

    clearTarget() {
        if (this.element) {
            this.element.removeEventListener("contextmenu", this.render)
            this.element = undefined
        }
    }

    render(e: MouseEvent) {
        if (!e.target) {
            return
        }

        let menu = this.contextMenuDelegate(e.target as HTMLElement)

        if (menu) {
            let backdrop = document.createElement("div")
            let contextMenu = document.createElement("div")
            backdrop.setAttribute("class", style.contextmenuBackdrop)
            contextMenu.setAttribute("class", style.contextmenu)

            menu.forEach(item => {
                let action = document.createElement("a")
                action.textContent = item.title
                action.addEventListener("click", () => {
                    item.action(e.target as HTMLElement)
                })
                contextMenu.appendChild(action)
            })

            contextMenu.setAttribute("style", `top: ${e.clientY}px; left:${e.clientX}px; z-index: 99999999;`)
            
            var originalElement = document.body

            backdrop.addEventListener("click", () => {
                originalElement.removeChild(backdrop)
            })

            backdrop.appendChild(contextMenu)

            originalElement.appendChild(backdrop)

            e.preventDefault();
        }
    }
}