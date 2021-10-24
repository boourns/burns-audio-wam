import { Component, h } from 'preact';
import { svg_rectangle, svg_text, svg_line } from '../../shared/ui/svg'
//import { ClipSettingsView } from './ClipSettingsView'
import { NoteDefinition } from 'wam-extensions';
import PianoRollModule from '.';
import { PianoRoll } from './PianoRoll';

import { ClipSettingsView } from './ClipSettingsView';
import { PPQN } from './Clip';
var logger = (...any: any) => {}
//const logger = console.log

class Design {
	static cellHeight = 20
	static gutterWidth = 80
	static headerHeight = 40
    static cellWidth = 20
}

type PositionEvent = MouseEvent & { layerX: number, layerY: number}

const ratio = window.devicePixelRatio || 1;

function positionFromEvent(e: PositionEvent) {
    // Safari populates these
    var x = e.offsetX
    var y = e.offsetY

    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        // FF populates these
        x = e.layerX
        y = e.layerY
    }

    return {x, y}
}

export type PianoRollProps = {
    pianoRoll: PianoRoll
    plugin: PianoRollModule
    clipId: string
}

type PianoRollState = {
    showSettingsModal: boolean
    layingNewNote?: {tick: number, number: number, duration: number}
}

export class PianoRollView extends Component<PianoRollProps, PianoRollState> {
    renderedBackground: boolean;
    zoom: number;
    position: number;
    dirty: boolean;
    ref?: HTMLDivElement;
    canvas?: HTMLCanvasElement;
    header?: HTMLDivElement;

    cellWidth: number;
    maxHeight: number;
    notes: NoteDefinition[];
    defaultNotes!: NoteDefinition[];
    body?: HTMLDivElement;
    totalWidth: number;
    clipLength: any;
    tickWidth: number;
    visibleCells: number;
    visibleTicks: number;
    scrubber?: SVGRectElement;
    scrubberPressed: boolean;
    scrubberMousePosition?: { x: any; y: any; };
    layingNote?: SVGElement;

    animationHandler: number;
    playhead?: SVGElement;

    // @ts-ignore
    resizeObserver?: ResizeObserver
    
    constructor() {
        super()

        this.state = {
            showSettingsModal: false,
        }

        this.initializeDefaultNotes()
        
        this.renderedBackground = false;
        this.zoom = 1.0
        this.position = 0 // in ticks currently
        this.visibleCells = 0
        this.visibleTicks = 0
        this.tickWidth = 0
        this.cellWidth = 0
        this.maxHeight = 0
        this.totalWidth = 0

        this.scrubberMouseDown = this.scrubberMouseDown.bind(this)
        this.scrubberMouseMove = this.scrubberMouseMove.bind(this)
        this.scrubberMouseUp = this.scrubberMouseUp.bind(this)

        this.gridMouseDown = this.gridMouseDown.bind(this)
        this.gridMouseMove = this.gridMouseMove.bind(this)
        this.gridMouseUp = this.gridMouseUp.bind(this)

        this.scrubberPressed = false
        this.dirty = false
        this.notes = []
        this.animate = this.animate.bind(this)
    }

    componentDidMount() {
        this.props.pianoRoll.renderCallback = () => {
            this.renderedBackground = false
            this.dirty = true
            this.forceUpdate()
        }

        this.animationHandler = window.requestAnimationFrame(this.animate)
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(this.animationHandler)

        this.ref = undefined
        this.canvas = undefined
        this.header = undefined

        window.removeEventListener('mousemove', this.scrubberMouseMove)
        window.removeEventListener('mouseup', this.scrubberMouseUp)
        window.removeEventListener("mousemove", this.gridMouseMove)
        window.removeEventListener("mouseup", this.gridMouseUp)
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = undefined
        }
        this.props.pianoRoll.renderCallback = undefined
    }

    addNote(tick: number, number: number, duration: number) {
         // remove any notes that overlap our quantized range
         let clip = this.props.pianoRoll.getClip(this.props.clipId)

         let existingNotes = clip.notesInTickRange(tick, tick + duration, number);

         existingNotes.forEach((n) => {
            clip.removeNote(n.tick, n.number);
         });

         clip.addNote(tick, number, duration, 100);
    }

    gridMouseDown(e: MouseEvent) {
        let eventPosition = positionFromEvent(e as PositionEvent)
        let x = eventPosition.x;
        let y = eventPosition.y;

        let clip = this.props.pianoRoll.getClip(this.props.clipId)

        var tick = this.position + ((x-Design.gutterWidth) / this.tickWidth!);
        tick = tick - (tick % clip.quantize)

        let index = Math.floor((this.maxHeight - y)/Design.cellHeight);
        if (index >= this.notes.length) {
            return
        }
        let number = this.notes[index].number;
        let duration = clip.quantize;

        // if there is a note exactly at the starting point for our tick, we remove that note
        if (clip.hasNote(tick, number)) {
            clip.removeNote(tick, number);
        } else {
            // we are laying down a new note
            window.addEventListener("mousemove", this.gridMouseMove)
            window.addEventListener("mouseup", this.gridMouseUp)

            this.setState({layingNewNote: {tick, number, duration}})
        }

        this.setup(this.ref);
    }

    gridMouseMove(e: MouseEvent) {
        let eventPosition = positionFromEvent(e as PositionEvent);
        let x = eventPosition.x;
        let y = eventPosition.y;

        let clip = this.props.pianoRoll.getClip(this.props.clipId)

        let tick = Math.floor(this.position) + (Math.floor((x-Design.gutterWidth) / this.cellWidth!) * clip.quantize);
        
        if (tick > this.state.layingNewNote!.tick) {
            this.setState({layingNewNote: {
                tick: this.state.layingNewNote!.tick,
                number: this.state.layingNewNote!.number,
                duration: tick - this.state.layingNewNote!.tick + clip.quantize
            }})
        }
    }

    gridMouseUp(e: MouseEvent) {
        //this.svg!.removeChild(this.layingNote!)
        this.layingNote = undefined;

        let note = this.state.layingNewNote!

        this.addNote(note.tick, note.number, note.duration)

        this.setState({layingNewNote: undefined});

        window.removeEventListener('mousemove', this.gridMouseMove)
        window.removeEventListener('mouseup', this.gridMouseUp)
    }

    async animate() {
        let timestamp = this.props.plugin.audioContext.currentTime
		var transport = this.props.plugin.transport
		
		if (!transport) {
            this.animationHandler = window.requestAnimationFrame(this.animate)
			return
		}

		if (transport.playing) {
            let clip = this.props.pianoRoll.getClip(this.props.clipId)
            var timeElapsed = this.props.plugin.audioContext.currentTime - transport.currentBarStarted

            var beatPosition = (transport.currentBar * transport.timeSigNumerator) + ((transport.tempo/60.0) * timeElapsed)

            var tickPosition = Math.floor(beatPosition * PPQN)
            let clipPosition = tickPosition % clip.state.length;

            if (clipPosition >= 0 && this.props.clipId == this.props.pianoRoll.playingClip) {
                var x = -10
                if (clipPosition >= this.position && clipPosition < this.position + this.visibleTicks) {
                    x = Design.gutterWidth + ((clipPosition - this.position) * this.tickWidth);
                }
                if (!this.playhead) {
                    this.playhead = svg_line(0, 0, 0, this.maxHeight, "red")
                    this.playhead.setAttribute("stroke-width", "2px")
                    //this.svg?.appendChild(this.playhead)
                }
                this.playhead.setAttribute("style", `will-change: transform; transform:translate(${x}px, 0px)`)
            } else if (this.playhead) {
                //this.svg?.removeChild(this.playhead)
                this.playhead = undefined
            }
        }

        this.animationHandler = window.requestAnimationFrame(this.animate)
    }

    setup(ref: HTMLDivElement | undefined | null) {
        logger("entering setup")
        let gutterWidth = Design.gutterWidth
        let cellHeight = Design.cellHeight

        if (ref == null || !this.props.pianoRoll.getClip(this.props.clipId)) {
            logger("Skipping rendering, ref=%o clipId=%o clip=%o", ref, this.props.clipId, this.props.pianoRoll.getClip(this.props.clipId))
            return
        }

        var firstRender = false;
        if (this.props.pianoRoll.noteList) {
            logger(`Have custom noteList length ${this.notes}`)
            this.notes = this.props.pianoRoll.noteList
        } else {
            logger(`Using default noteList length ${this.defaultNotes.length}`)

            this.notes = this.defaultNotes
        }

        let noteCount = this.notes.length

        if (this.ref != ref || !this.renderedBackground) {
            logger("Rendering background")

            ref.innerHTML = ""

            firstRender = true;
            this.header = document.createElement("div")
            let body = document.createElement("div");
            body.setAttribute("class", "pianoroll-body");
            this.body = body;

            // if (this.svg && this.playhead) {
            //     this.svg.removeChild(this.playhead)
            //     this.playhead = undefined
            // }

            let canvas = document.createElement("canvas")

            this.canvas = canvas;

            body.appendChild(canvas)
            ref.appendChild(this.header)
            ref.appendChild(body)

            if (this.resizeObserver) {
                this.resizeObserver.disconnect()
                this.resizeObserver = undefined
            }

            // @ts-ignore
            this.resizeObserver = new ResizeObserver((entries: any[]) => {
                logger("resize! totalWidth=%o entries %o", this.totalWidth, entries)

                if (this.totalWidth != entries[0].contentRect.width) {
                    let delta = Math.abs(this.totalWidth - entries[0].contentRect.width)
                    logger(`totalWidth=${this.totalWidth} contentRect=${entries[0].contentRect.width} delta=${delta}`)
                    this.totalWidth = entries[0].contentRect.width
                    this.renderedBackground = false
                    this.forceUpdate()
                }
              });
    
            this.resizeObserver.observe(ref)

            if (this.totalWidth == 0) {
                logger(`totalWidth 0, starting at ${window.innerWidth * 0.9}`)
                this.totalWidth = window.innerWidth * 0.9
            }

            this.maxHeight = cellHeight * noteCount;
            canvas.style.height = `${this.maxHeight}px`
            canvas.style.width = `${this.totalWidth}px`
            canvas.width = this.totalWidth * ratio
            canvas.height = this.maxHeight * ratio

            canvas.addEventListener('mousedown', this.gridMouseDown)

            let ctx = canvas.getContext("2d")

            this.notes.forEach((note, i) => {
                // main background
                let mainColor = note.blackKey ? "#bbbbbb" : "white"

                fillRect(ctx, 0, this.maxHeight-cellHeight*(i+1), this.totalWidth, cellHeight, mainColor)

                // gutter
                let gutterColor = note.blackKey ? "black" : "white"
                
                fillRect(ctx, 0, this.maxHeight-cellHeight*(i+1), gutterWidth, cellHeight, gutterColor)

                if (note.name) {
                    fillText(ctx, note.name, 5, this.maxHeight-cellHeight*(i)-4, 24, note.blackKey ? "#fff" : "#000")
                }
            })

            this.ref = ref;

            this.renderedBackground = true;
            this.dirty = true
        }

        let clip = this.props.pianoRoll.getClip(this.props.clipId)
        this.clipLength = clip.state.length

        // break from gutter to edge into N steps
        let visibleTicks = this.clipLength * this.zoom;
        this.visibleTicks = visibleTicks
        this.tickWidth = (this.totalWidth - gutterWidth) / visibleTicks;

        this.visibleCells = visibleTicks / clip.quantize;
        this.cellWidth = this.tickWidth * clip.quantize;

        let ctx = this.canvas.getContext("2d")

        if (clip.needsRender() || this.dirty) {
            logger("Rendering clip")

            let newHeader = this.renderHeader();
            if (this.header) {
                ref.replaceChild(newHeader, this.header);
            }
            this.header = newHeader;

            clip.setRenderFlag(false);
            this.dirty = false;

            // calculate first line position, in ticks.
            let firstLine = Math.floor((this.position - (this.position % clip.quantize)));

            for (var pos = firstLine; pos < this.position + visibleTicks; pos += clip.quantize) {
                if (pos >= this.position) {
                    let x = gutterWidth + ((pos - this.position) * this.tickWidth)
                    let style = (pos % 24 == 0) ? "black" : "grey"
                    let lineWidth = 1
                    if (pos % 24 == 0) {
                        lineWidth = 2
                    }

                    line(ctx, x, 0, x, this.maxHeight, lineWidth, style)
                }
            }

            var firstNoteHeight = this.maxHeight;
            clip.state.notes.forEach((note) => {
                if (note.tick + note.duration < this.position || note.tick >= this.position + visibleTicks) {
                    return
                }
                let index = this.notes.findIndex(n => n.number == note.number)

                var x = gutterWidth + ((note.tick - this.position) * this.tickWidth);
                var y = this.maxHeight - cellHeight*(index+1);
                var width = this.tickWidth * note.duration;
                var height = cellHeight;

                if (y < firstNoteHeight) {
                    // calculate the height of the first note for pre-scrolling
                    firstNoteHeight = y;
                }

                if (x < gutterWidth) {
                    // subtract the overlap between x and gutterwidth from original width
                    width = width - (gutterWidth - x);
                    x = gutterWidth;
                }

                fillRect(ctx, x, y, width, height, "red")
            })
            
            if (firstRender) {
                window.setTimeout(() => {
                    if (clip.state.notes.length > 0) {
                        var pos = (firstNoteHeight > 40) ? firstNoteHeight-40 : firstNoteHeight;
                        this.body!.scrollTop = pos;
                    } else {
                        this.body!.scrollTop = this.maxHeight / 2;
                    }
                }, 10)
                this.dirty = true
                this.forceUpdate()
            }
        } else {
            logger(`Skipping clip render, this.dirty=${this.dirty} clip.needsRender()=${clip.needsRender()}`)
        }

        // render the new note, still being laid
        if (this.state.layingNewNote) {
            let note = this.state.layingNewNote;

            var x = gutterWidth + ((note.tick - this.position) * this.tickWidth);
            var width = this.tickWidth * note.duration;
            var height = cellHeight;

            let index = this.notes.findIndex(n => n.number == note.number)
            var y = this.maxHeight - cellHeight*(index+1);

            fillRect(ctx, x, y, width, height, "red")
        }  
    }

    render() {
        h("div", {})
        logger("entering render")

        var settingsModal = null
        if (this.state.showSettingsModal) {
            settingsModal = <ClipSettingsView clip={this.props.pianoRoll.getClip(this.props.clipId)} onChange={() => this.clipSettingsChanged()} onClose={() => this.closeClipSettings()} />
        }

        return (
            <div ref={(ref) => this.setup(ref)} class="pianoroll-container">
                {settingsModal}
                <style>
                    {this.css()}
                </style>
            </div>
        )
    }

    initializeDefaultNotes() {
        this.defaultNotes = []

        for (var i = 0; i < 128; i++) {
            let octave = Math.floor(i/12) - 1
            let note = i % 12

            let name = (note == 0) ? `C${octave}` : undefined
            let blackKey = (note == 1 || note == 3 || note == 6 || note == 8 || note == 10)

            this.defaultNotes.push({number: i, name: name, blackKey: blackKey})
        }
    }

    renderHeader() {
        let container = document.createElement("div")
        container.setAttribute("style", `height: ${Design.headerHeight}px; display: flex; background-color: rgba(255, 255, 255, 0.4)`)

        let span = document.createElement("div")
        span.setAttribute("style", `width: ${Design.gutterWidth}px; display: inline-block; margin: 0 auto; `)
        
        let settingsButton = document.createElement("button")
        settingsButton.textContent = "Settings"
        settingsButton.setAttribute("class", "border m-1 px-2 py-1 border-gray-700 bg-gray-300 text-xs shadow-md")
        settingsButton.addEventListener("click", this.settingsButtonPressed.bind(this))
        span.appendChild(settingsButton)
        container.appendChild(span)

        let scrubberLength = this.totalWidth-Design.gutterWidth;
        let clipHeader = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        clipHeader.setAttribute("style", `height: ${Design.headerHeight}px; width: ${scrubberLength}px; background-color: rgba(255, 255, 255, 0.4)`)
        container.appendChild(clipHeader)

        let positionPercent = this.position / this.clipLength;

        this.scrubber = svg_rectangle(scrubberLength*positionPercent, 0, scrubberLength * this.zoom, Design.headerHeight, "red")
        this.scrubber.addEventListener("mousedown", this.scrubberMouseDown)
        clipHeader.appendChild(this.scrubber)
        
        return container
    }

    settingsButtonPressed(e: MouseEvent) {
        this.setState({
            showSettingsModal: true
        })
    }

    scrubberMouseDown(e: MouseEvent) {
        this.scrubberPressed = true
        this.scrubberMousePosition = {x: e.screenX, y: e.screenY}

        window.addEventListener('mousemove', this.scrubberMouseMove)
        window.addEventListener('mouseup', this.scrubberMouseUp)
    }

    scrubberMouseUp(e: MouseEvent) {
        this.scrubberPressed = false
        window.removeEventListener('mousemove', this.scrubberMouseMove)
        window.removeEventListener('mouseup', this.scrubberMouseUp)
    }

    scrubberMouseMove(e: MouseEvent) {
        if (this.scrubberPressed) {
            let distance = {x: e.screenX - this.scrubberMousePosition!.x, y: e.screenY - this.scrubberMousePosition!.y}

            this.scrubberMousePosition = {x: e.screenX, y: e.screenY}

            var zoom = this.zoom - (distance.y * 0.002)
            if (zoom < 0.01) {
                zoom = 0.01
            } else if (zoom > 1.0) {
                zoom = 1.0
            }
            this.zoom = zoom

            var position = this.position + (distance.x/(this.totalWidth-Design.gutterWidth)*this.clipLength)
            
            if (position < 0) {
                position = 0
            }
            if (position + (this.zoom*this.clipLength) > this.clipLength) {
                position = this.clipLength - (this.zoom*this.clipLength);
            }
            this.position = position
            this.dirty = true
            this.forceUpdate()
        }
    }

    clipSettingsChanged() {
        this.dirty = true
        this.forceUpdate()
    }

    closeClipSettings() {
        this.dirty = true
        this.setState({
            showSettingsModal: false
        })
    }

    css(): string {
        return `
        
.pianoroll-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.pianoroll-body {
    flex-shrink: 1;
    overflow: scroll;
    scrollbar-width: none; /* fixes endless resize bug on old FF, but probably needs to be replaced to a fixed width */
}

.pianoroll {
    stroke:grey; 
    fill:none; 
    stroke-width:1
}

.black-key {
    background-color: #444444
}

.black-key {
    background-color: #cccccc
}

.note-row {
    height: 10px;
}
        `
    }
}


function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: string) {
    ctx.strokeStyle = ""
    ctx.fillStyle = style
    ctx.fillRect(x*ratio, y*ratio, w*ratio, h*ratio)
}

function fillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, style: string) {
    ctx.font = `${size*ratio}px`
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