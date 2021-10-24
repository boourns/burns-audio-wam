import { NoteDefinition } from "wam-extensions";
import { Clip, Note } from "./Clip";

var logger = (...any: any) => {}
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

    render(state: NoteCanvasRenderState) {
        let canvas = document.createElement("canvas")
        this.canvas = canvas;

        canvas.style.height = `${state.height}px`
        canvas.style.width = `${state.width}px`
        canvas.width = state.width * ratio
        canvas.height = state.height * ratio

        let facts = this.calculateFacts(state)
        this.facts = facts

        let ctx = this.canvas.getContext("2d")

        this.renderBackground(state)

        if (state.clip.needsRender()) {
            logger("Rendering clip")

            state.clip.setRenderFlag(false);

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

                fillRect(ctx, x, y, width, height, "red")
            })

            facts.firstNoteRenderHeight = firstNoteHeight
            
        } else {
            logger(`Skipping clip render, clip.needsRender()=${state.clip.needsRender()}`)
        }

        // render the new note, still being laid
        if (state.layingNewNote) {
            let note = state.layingNewNote;

            var x = Design.gutterWidth + ((note.tick - state.position) * facts.tickWidth);
            var width = facts.tickWidth * note.duration;
            var height = Design.cellHeight;

            let index = state.visibleNotes.findIndex(n => n.number == note.number)
            var y = state.height - Design.cellHeight*(index+1);

            fillRect(ctx, x, y, width, height, "red")
        }

        return canvas
    }

    instantiateCanvas() {

    }

    renderBackground(state: NoteCanvasRenderState) {
        let ctx = this.canvas.getContext("2d")

        state.visibleNotes.forEach((note, i) => {
            // main background
            let mainColor = note.blackKey ? "#bbbbbb" : "white"

            fillRect(ctx, 0, state.height-Design.cellHeight*(i+1), state.width, Design.cellHeight, mainColor)

            // gutter
            let gutterColor = note.blackKey ? "black" : "white"
            
            fillRect(ctx, 0, state.height-Design.cellHeight*(i+1), Design.gutterWidth, Design.cellHeight, gutterColor)

            if (note.name) {
                fillText(ctx, note.name, 5, state.height-Design.cellHeight*(i)-4, 14, note.blackKey ? "#fff" : "#000")
            }
        })
    }
}

function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: string) {
    ctx.strokeStyle = ""
    ctx.fillStyle = style
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