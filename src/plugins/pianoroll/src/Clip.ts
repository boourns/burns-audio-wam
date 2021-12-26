import { token } from "../../shared/util"

export const PPQN = 24;
export const PP16 = (PPQN/4);

export type Note = {
    tick: number
    number: number
    duration: number
    velocity: number
}

export type ClipState = {
    id?: string
    length: number
    notes: Note[]
}

export class Clip {
    state: ClipState
    dirty: boolean;
    quantize: number;
    updateProcessor?: (c: Clip) => void
    
    constructor(id?: string, state?: ClipState) {
        if (state) {
            this.state = {
                id: id || state.id,
                length: state.length,
                notes: state.notes.map(n => {
                    return {...n}
                })
            }
        } else {
            this.state = {
                id: id || token(),
                length: 16*PP16,
                notes: []
            }
        }

        this.dirty = true;
        this.quantize = PP16;
    }

    getState(removeId?: boolean): ClipState {
        let state: ClipState = {
            length: this.state.length, 
            notes: this.state.notes.map(n => {
                return {...n}
            })
        }
        if (!removeId) {
            state.id = this.state.id
        }
        return state
    }

    async setState(state: ClipState, newId?: string) {
        if (!state.id && !newId) {
            console.error("Need an id for clip!")
            return
        }

        this.state.id = newId ? newId : state.id
        this.state.length = state.length
        this.state.notes = state.notes.map(n => {
            return {...n}
        })

        this.dirty = true;
        if (this.updateProcessor) this.updateProcessor(this)
    }

    hasNote(tick: number, number: number) {
        return this.state.notes.some((n) => n.tick == tick && n.number == number)
    }

    addNote(tick: number, number: number, duration: number, velocity: number) {
        this.dirty = true;

        if (this.hasNote(tick, number)) {
            return
        }
        for (var insertIndex = 0; insertIndex < this.state.notes.length && this.state.notes[insertIndex].tick < tick; insertIndex++);

        this.state.notes = this.state.notes.slice(0, insertIndex).concat(
            [{tick, number, duration, velocity}].concat(this.state.notes.slice(insertIndex, this.state.notes.length)))
        
        if (this.updateProcessor) this.updateProcessor(this)
    }

    removeNote(tick: number, number: number) {
        this.dirty = true;

        this.state.notes = this.state.notes.filter((n) => n.tick != tick || n.number != number)
        if (this.updateProcessor) this.updateProcessor(this)
    }

    notesForTick(tick: number): Note[] {
        return this.state.notes.filter((n) => n.tick == tick)
    }

    notesInTickRange(startTick: number, endTick: number, note: number): Note[] {
        return this.state.notes.filter((n) => {
            return n.number == note && n.tick + n.duration > startTick && n.tick < endTick
        })
    }

    setRenderFlag(dirty: boolean) {
        this.dirty = dirty;
    }

    needsRender(): boolean {
        return this.dirty;
    }
}
