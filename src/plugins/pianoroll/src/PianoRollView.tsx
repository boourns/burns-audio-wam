import { Component, h } from 'preact';
import { svg_rectangle, svg_text, svg_line } from '../../shared/ui/svg'
//import { ClipSettingsView } from './ClipSettingsView'
import { NoteDefinition } from 'wam-extensions';
import PianoRollModule from '.';
import { PianoRoll } from './PianoRoll';

import { ClipSettingsView } from './ClipSettingsView';
import { Note, PPQN } from './Clip';
import { Design, NoteCanvasRenderer, NoteCanvasRenderState } from './NoteCanvasRenderer';

const logger = (...any: any) => {}
//const logger = console.log

import styleRoot from "./PianoRollView.scss"

// @ts-ignore
let styles = styleRoot.locals as typeof styleRoot

type PositionEvent = MouseEvent & { layerX: number, layerY: number}

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
    layingNewNote?: Note
}

export class PianoRollView extends Component<PianoRollProps, PianoRollState> {
    zoom: number;
    position: number;

    ref?: HTMLDivElement;
    header?: HTMLDivElement;
    canvasRenderer: NoteCanvasRenderer;

    totalHeight: number;
    notes: NoteDefinition[];
    defaultNotes!: NoteDefinition[];
    body?: HTMLDivElement;
    totalWidth: number;
    clipLength: number;

    scrubber?: SVGRectElement;
    scrubberPressed: boolean;
    scrubberMousePosition?: { x: any; y: any; };

    animationHandler: number;

    // @ts-ignore
    resizeObserver?: ResizeObserver

    firstRender: boolean
    
    constructor() {
        super()

        this.state = {
            showSettingsModal: false,
        }

        this.initializeDefaultNotes()
        
        this.zoom = 1.0
        this.position = 0 // in ticks currently
        this.totalHeight = 0
        this.totalWidth = 0

        this.scrubberMouseDown = this.scrubberMouseDown.bind(this)
        this.scrubberMouseMove = this.scrubberMouseMove.bind(this)
        this.scrubberMouseUp = this.scrubberMouseUp.bind(this)

        this.gridMouseDown = this.gridMouseDown.bind(this)
        this.gridMouseMove = this.gridMouseMove.bind(this)
        this.gridMouseUp = this.gridMouseUp.bind(this)

        this.scrubberPressed = false
        this.notes = []
        this.animate = this.animate.bind(this)

        this.canvasRenderer = new NoteCanvasRenderer(document)
        this.firstRender = true
    }

    componentDidMount() {
        this.props.pianoRoll.renderCallback = () => {
            this.forceUpdate()
        }

        this.animationHandler = window.requestAnimationFrame(this.animate)
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(this.animationHandler)

        this.ref = undefined
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
        var tick = this.position + ((x-Design.gutterWidth) / this.canvasRenderer.facts.tickWidth!);
        tick = tick - (tick % clip.quantize)

        let index = Math.floor((this.totalHeight - y)/Design.cellHeight);
        if (index >= this.notes.length) {
            return
        }
        let number = this.notes[index].number;
        let duration = clip.quantize;

        // // if there is a note exactly at the starting point for our tick, we remove that note
        if (clip.hasNote(tick, number)) {
            clip.removeNote(tick, number);
            this.forceUpdate()
        } else {
            // we are laying down a new note
            window.addEventListener("mousemove", this.gridMouseMove)
            window.addEventListener("mouseup", this.gridMouseUp)

            this.setState({layingNewNote: {tick, number, duration, velocity: 100}})
        }
    }

    gridMouseMove(e: MouseEvent) {
        let eventPosition = positionFromEvent(e as PositionEvent);
        let x = eventPosition.x;
        let y = eventPosition.y;

        let clip = this.props.pianoRoll.getClip(this.props.clipId)

        let tick = Math.floor(this.position) + (Math.floor((x-Design.gutterWidth) / this.canvasRenderer.facts.cellWidth) * clip.quantize);
        
        if (tick > this.state.layingNewNote!.tick) {
            this.setState({layingNewNote: {
                tick: this.state.layingNewNote!.tick,
                number: this.state.layingNewNote!.number,
                duration: tick - this.state.layingNewNote!.tick + clip.quantize,
                velocity: 100
            }})
        }
    }

    gridMouseUp(e: MouseEvent) {
        let note = this.state.layingNewNote!

        this.addNote(note.tick, note.number, note.duration)

        this.setState({layingNewNote: undefined});

        window.removeEventListener('mousemove', this.gridMouseMove)
        window.removeEventListener('mouseup', this.gridMouseUp)
    }

    async animate() {
		var transport = this.props.plugin.transport
        let playhead = this.canvasRenderer.playhead

        if (transport && playhead) {
            let x = -1000

            if (transport.playing) {
                let clip = this.props.pianoRoll.getClip(this.props.clipId)
                let timeElapsed = this.props.plugin.audioContext.currentTime - transport.currentBarStarted
    
                let beatPosition = (transport.currentBar * transport.timeSigNumerator) + ((transport.tempo/60.0) * timeElapsed)
    
                let tickPosition = Math.floor(beatPosition * PPQN)
                let clipPosition = tickPosition % clip.state.length;
    
                if (clipPosition >= 0 && this.props.clipId == this.props.pianoRoll.playingClip) {
                    if (clipPosition >= this.position && clipPosition < this.position + this.canvasRenderer.facts.visibleTicks) {
                        x = Design.gutterWidth + ((clipPosition - this.position) * this.canvasRenderer.facts.tickWidth);
                    }
                }
            }

            playhead.setAttribute("style", `left: ${x}px`)
        }

        this.animationHandler = window.requestAnimationFrame(this.animate)
    }

    setup(ref: HTMLDivElement | undefined | null) {
        logger("entering setup")

        let clip = this.props.pianoRoll.getClip(this.props.clipId)
        if (ref == null || !clip) {
            logger("Skipping rendering, ref=%o clipId=%o clip=%o", ref, this.props.clipId, this.props.pianoRoll.getClip(this.props.clipId))
            return
        }

        // do we need to reposition the scroll
        //var firstRender = false;

        if (this.props.pianoRoll.noteList) {
            logger(`Have custom noteList length ${this.notes}`)
            this.notes = this.props.pianoRoll.noteList
        } else {
            logger(`Using default noteList length ${this.defaultNotes.length}`)

            this.notes = this.defaultNotes
        }

        this.totalHeight = Design.cellHeight * this.notes.length;
        if (this.totalWidth == 0) {
            logger(`totalWidth 0, starting at ${window.innerWidth * 0.9}`)
            this.totalWidth = window.innerWidth * 0.9
        }

        this.clipLength = clip.state.length

        let rendererState: NoteCanvasRenderState = {
            width: this.totalWidth,
            height: this.totalHeight,
            position: this.position,
            horizontalZoom: this.zoom,
            clip: clip,
            visibleNotes: this.notes,
            layingNewNote: this.state.layingNewNote
        }

        let canvas = this.canvasRenderer.render(rendererState)
        clip.setRenderFlag(false);

        let header = this.renderHeader();

        if (this.ref != ref) {
            ref.innerHTML = ""

            let body = document.createElement("div");
            body.setAttribute("class", styles.pianorollBody);
            this.body = body;

            body.appendChild(canvas)
            body.appendChild(this.canvasRenderer.playhead)
            this.canvasRenderer.playhead.setAttribute("class", styles.playhead)

            ref.appendChild(header)
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
                    this.forceUpdate()
                }
              });
    
            this.resizeObserver.observe(ref)
            canvas.addEventListener('mousedown', this.gridMouseDown)

            this.ref = ref;
        } else if (this.header) {
            this.ref.replaceChild(header, this.header)
        }
        this.header = header

        if (this.firstRender) {
            window.setTimeout(() => {
                if (clip.state.notes.length > 0) {
                    let firstNoteHeight = this.canvasRenderer.facts.firstNoteRenderHeight
                    var pos = (firstNoteHeight > 40) ? firstNoteHeight-40 : firstNoteHeight;
                    this.body!.scrollTop = pos;
                } else {
                    this.body!.scrollTop = this.totalHeight / 2;
                }
            }, 10)
            this.firstRender = false
            this.forceUpdate()
        }
        
    }

    render() {
        h("div", {})
        logger("entering render")

        var settingsPanel = null
        if (this.state.showSettingsModal) {
            settingsPanel = <ClipSettingsView clip={this.props.pianoRoll.getClip(this.props.clipId)} onChange={() => this.clipSettingsChanged()} />
        }

        let settingsLabel = this.state.showSettingsModal ? "Settings ▾" : "Settings ▸"

        let recordingLabel = this.props.pianoRoll.pluginRecordingArmed ? "Rec armed 🔴" : "Press to record ⚫️"

        return (
            <div style="display: flex; flex-direction: column; height: 100%">
                <div style="height: 40px; background-color: darkgray; display: flex; flex-direction: row; justify-content: space-between;">
                    <div>
                        <button class={styles.menuButton} onClick={() => this.recordingPressed()}>{recordingLabel}</button>
                        <button class={styles.menuButton} onClick={() => this.clearButtonPressed()}>Clear Pattern</button>
                    </div>
                    
                    <div class={styles.anchor} style="text-align: right;">
                        <button class={`${styles.menuButton}`} onClick={() => this.settingsButtonPressed()}>{settingsLabel}</button>
                        {settingsPanel}
                    </div>
                </div>
                <div ref={(ref) => this.setup(ref)} class={styles.pianorollContainer}></div>
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

    clearButtonPressed() {
        const clip = this.props.pianoRoll.getClip(this.props.clipId)
        let state = clip.getState()
        state.notes = []
        clip.setState(state)
        this.forceUpdate()
    }

    renderHeader() {
        let container = document.createElement("div")
        container.setAttribute("style", `height: ${Design.headerHeight}px; display: flex; background-color: rgba(255, 255, 255, 0.4)`)

        let span = document.createElement("div")
        span.setAttribute("style", `width: ${Design.gutterWidth}px; display: flex; margin: auto; `)
        
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

    settingsButtonPressed() {
        this.setState({
            showSettingsModal: !this.state.showSettingsModal
        })
    }

    recordingPressed() {
        this.props.pianoRoll.armPluginRecording(!this.props.pianoRoll.pluginRecordingArmed)
        this.forceUpdate()
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
            this.forceUpdate()
        }
    }

    clipSettingsChanged() {
        this.forceUpdate()
    }
}


