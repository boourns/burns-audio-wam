import { token } from "../../shared/util"

export const PPQN = 24;
export const PP16 = (PPQN/4);

export type ClipState = {
    id: string
    length: number // in steps
    steps: number[]
    speed: number // in ticks
}

export class Clip {
    state: ClipState
    dirty: boolean;

    updateProcessor?: (c: Clip) => void
    
    constructor(id?: string, state?: ClipState) {
        if (state) {
            this.state = {
                id: state.id,
                length: state.length,
                speed: state.speed,
                steps: [...state.steps]
            }
        } else {
            this.state = {
                id: id || token(),
                length: 8,
                steps: [0,0,0,0,0,0,0,0],
                speed: 24,
            }
        }

        this.dirty = true;
    }

    getState() {
        return {
            id: this.state.id,
            length: this.state.length, 
            steps: [...this.state.steps],
            speed: this.state.speed
        }
    }

    async setState(state: ClipState) {
        this.state.id = state.id
        this.state.length = state.length
        this.state.steps = [...state.steps]
        this.state.speed = state.speed

        this.dirty = true;
        if (this.updateProcessor) this.updateProcessor(this)
    }

    setRenderFlag(dirty: boolean) {
        this.dirty = dirty;
    }

    needsRender(): boolean {
        return this.dirty;
    }
}
