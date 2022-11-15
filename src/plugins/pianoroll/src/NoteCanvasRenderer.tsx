import { WamTransportData } from "@webaudiomodules/api";
import { NoteDefinition } from "wam-extensions";
import { Clip, Note } from "./Clip";

const logger = (...any: any) => {}
//const logger = console.log

const ratio = window.devicePixelRatio || 1;

export class Design {
	static cellHeight = 20
	static gutterWidth = 80
	static headerHeight = 40
    static cellWidth = 20
}

export type NoteCanvasRenderState = {
    width: number
    height: number
    position: number
    horizontalZoom: number
    clip: Clip
    visibleNotes: NoteDefinition[];
    layingNewNote: Note
    transportData: WamTransportData
}

type NoteCanvasRenderFacts = {
    visibleTicks: number
    tickWidth: number
    visibleCells: number
    cellWidth: number
    firstNoteRenderHeight: number
}

export class NoteCanvasRenderer {
    doc: Document
    canvas?: HTMLCanvasElement
    playhead?: HTMLCanvasElement

    oldState?: NoteCanvasRenderState
    facts?: NoteCanvasRenderFacts

    cellWidth: number

    constructor(doc: Document) {
        this.doc = doc
        this.cellWidth = 0
    }

    calculateFacts(state: NoteCanvasRenderState): NoteCanvasRenderFacts {
        let visibleTicks = state.clip.state.length * state.horizontalZoom;
        let tickWidth = (state.width - Design.gutterWidth) / visibleTicks;

        return {
            visibleTicks,
            tickWidth,
            visibleCells: visibleTicks / state.clip.quantize,
            cellWidth: tickWidth * state.clip.quantize,
            firstNoteRenderHeight: 0,
        }
    }

    dimensionsChanged(newState: NoteCanvasRenderState): boolean {
        return !this.oldState || this.oldState.width != newState.width || this.oldState.height != newState.height
    }

    visibleNotesChanged(newState: NoteCanvasRenderState): boolean {
        if (!this.oldState) {
            return true
        }

        if (newState.visibleNotes.length != this.oldState.visibleNotes.length) {
            return true
        }

        return newState.visibleNotes.some((element, i) => !sameNote(element, this.oldState.visibleNotes[i]))
    }

    render(state: NoteCanvasRenderState) {
        const dimensionsChanged = this.dimensionsChanged(state)
        const horizontalChanged = !this.oldState || this.oldState.horizontalZoom != state.horizontalZoom || this.oldState.position != state.position
        const visibleNotesChanged = this.visibleNotesChanged(state)
        const mustRender = !this.canvas || dimensionsChanged || visibleNotesChanged || horizontalChanged || state.clip.needsRender() || state.layingNewNote

        if (!this.canvas) {
            this.canvas = this.doc.createElement("canvas")
        }
        if (!this.playhead) {
            this.playhead = this.doc.createElement("canvas")
        }

        const canvas = this.canvas
        const playhead = this.playhead

        if (dimensionsChanged) {
            canvas.style.height = `${state.height}px`
            canvas.style.width = `${state.width}px`
            canvas.width = state.width * ratio
            canvas.height = state.height * ratio

            playhead.height = state.height
            playhead.width = 1

            this.renderPlayhead(state)
        }

        let facts = this.calculateFacts(state)
        this.facts = facts

        let ctx = this.canvas.getContext("2d")

        if (mustRender) {
            this.renderBackground(state)        
        
            // calculate first line position, in ticks.
            let firstLine = Math.floor((state.position - (state.position % state.clip.quantize)));

            for (var pos = firstLine; pos < state.position + facts.visibleTicks; pos += state.clip.quantize) {
                if (pos >= state.position) {
                    let x = Design.gutterWidth + ((pos - state.position) * facts.tickWidth)
                    let style = (pos % 24 == 0) ? "black" : "grey"
                    let lineWidth = 1
                    if (pos % 24 == 0) {
                        lineWidth = 2
                    }
                    if (pos % (24 * state.transportData.timeSigNumerator) == 0) {
                        lineWidth = 3
                    }

                    line(ctx, x, 0, x, state.height, lineWidth, style)
                }
            }

            var firstNoteHeight = state.height;

            state.clip.state.notes.forEach((note) => {
                if (note.tick + note.duration < state.position || note.tick >= state.position + facts.visibleTicks) {
                    return
                }
                let index = state.visibleNotes.findIndex(n => n.number == note.number)

                var x = Design.gutterWidth + ((note.tick - state.position) * facts.tickWidth);
                var y = state.height - Design.cellHeight*(index+1);
                var width = facts.tickWidth * note.duration;
                var height = Design.cellHeight;

                if (y < firstNoteHeight) {
                    // calculate the height of the first note for pre-scrolling
                    firstNoteHeight = y;
                }

                if (x < Design.gutterWidth) {
                    // subtract the overlap between x and gutterwidth from original width
                    width = width - (Design.gutterWidth - x);
                    x = Design.gutterWidth;
                }

                rect(ctx, x, y, width, height, "red")
            })

            facts.firstNoteRenderHeight = firstNoteHeight
        }

        // render the new note, still being laid
        if (state.layingNewNote) {
            let note = state.layingNewNote;

            var x = Design.gutterWidth + ((note.tick - state.position) * facts.tickWidth);
            var width = facts.tickWidth * note.duration;
            var height = Design.cellHeight;

            let index = state.visibleNotes.findIndex(n => n.number == note.number)
            var y = state.height - Design.cellHeight*(index+1);

            rect(ctx, x, y, width, height, "red")
        }

        this.oldState = state

        return canvas
    }

    renderPlayhead(state: NoteCanvasRenderState) {
        let ctx = this.playhead.getContext("2d")
        rect(ctx, 0, 0, 2, state.height, "red")
    }

    renderBackground(state: NoteCanvasRenderState) {
        let ctx = this.canvas.getContext("2d")

        state.visibleNotes.forEach((note, i) => {
            // main background
            let mainColor = note.blackKey ? "#bbbbbb" : "white"

            ctx.strokeStyle = "black"
            ctx.lineWidth = 1
            const y = state.height-Design.cellHeight*(i+1)

            rect(ctx, 0, y, state.width, Design.cellHeight, mainColor)
            line(ctx, 0, y, state.width, y, 1, "gray")

            // gutter
            let gutterColor = note.blackKey ? "black" : "white"
            
            rect(ctx, 0, state.height-Design.cellHeight*(i+1), Design.gutterWidth, Design.cellHeight, gutterColor)

            if (note.name) {
                fillText(ctx, note.name.substring(0,9), 5, state.height-Design.cellHeight*(i)-4, 14, note.blackKey ? "#fff" : "#000")
            }
        })
    }
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fillStyle: string) {
    ctx.fillStyle = fillStyle
    ctx.fillRect(x*ratio, y*ratio, w*ratio, h*ratio)
}

function fillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, style: string) {
    ctx.font = `${size*ratio}px sans-serif`
    ctx.strokeStyle = ""
    ctx.fillStyle = style
    
    ctx.fillText(text, x*ratio, y*ratio)
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, style: string) {
    ctx.lineWidth = width
    ctx.strokeStyle = style
    
    ctx.beginPath()
    ctx.moveTo(x1*ratio, y1*ratio)
    ctx.lineTo(x2*ratio, y2*ratio)
    ctx.stroke()
}

function sameNote(n1: NoteDefinition, n2: NoteDefinition): boolean {
    return n1.blackKey == n2.blackKey && n1.name == n2.name && n1.number == n2.number
}