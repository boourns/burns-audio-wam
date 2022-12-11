export function insertStyle(shadow: ShadowRoot, style: string) {
    const el = document.createElement('style')
    el.textContent = style

    shadow.appendChild(el)
}