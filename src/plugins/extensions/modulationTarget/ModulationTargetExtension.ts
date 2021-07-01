import { WamParameterInfo } from "../../sdk/src"

export type ModulationTargetDelegate = {
    setModulationTarget: (param: WamParameterInfo) => void
}

export class ModulationTargetExtension {
    delegates: Map<string, ModulationTargetDelegate>

    constructor() {
        this.delegates = new Map()
    }

    setModulationTargetDelegate(pluginId: string, delegate?: ModulationTargetDelegate) {
        if (delegate) {
            this.delegates.set(pluginId, delegate)
        } else {
            this.delegates.delete(pluginId)
        }
    }

    getModulationTargetDelegate(pluginId: string): ModulationTargetDelegate | undefined {
        return this.delegates.get(pluginId)
    }


}