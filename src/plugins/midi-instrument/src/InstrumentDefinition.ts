import {NoteDefinition} from "wam-extensions"

export type CirklonTrackEntry = {
    MIDI_CC?: number
    label: string
}

export type CirklonCCEntry = {
    label: string
    min_val?: number
    max_val?: number
    start_val?: number
}

export type CirklonRowEntry = {
    label: string
    always_show: boolean
}

export type MIDIControlChange = {
    ccNumber: number
    name: string
    minValue?: number
    maxValue?: number
    startValue?: number
}

export type CirklonInstrumentDefinition = {
    track_values: Record<string, CirklonTrackEntry>
    CC_defs: Record<string, CirklonCCEntry>
    row_defs: Record<string, CirklonRowEntry>
}

export type CirklonInstrumentDefinitionFile = {
    instrument_data: Record<string, CirklonInstrumentDefinition>
}

export class InstrumentDefinition {
    name: string
    notes?: NoteDefinition[]
    midiCCs: MIDIControlChange[]
    
    constructor(name: string, midiCCs: MIDIControlChange[] = [], notes: undefined | NoteDefinition[] = undefined) {
        this.name = name
        this.midiCCs = midiCCs
        this.notes = notes
    }

    parseDefinition(def: CirklonInstrumentDefinition): InstrumentDefinition {
        if (def.row_defs !== undefined) {
            // we have rows specified, so load the note definitions
            let rowNames = Object.keys(def.row_defs)

            this.notes = rowNames.map(row => {
                let noteNumber = this.rowNameToNoteNumber(row)
                return {
                    number: noteNumber,
                    name: def.row_defs[row].label,
                    blackKey: false
                }
            })
        }
        let ccMap = new Map<number, MIDIControlChange>()

        if (def.track_values !== undefined) {
            let trackNames = Object.keys(def.track_values)
            trackNames.forEach(trackName => {
                if (def.track_values[trackName].MIDI_CC !== undefined) {
                    ccMap.set(def.track_values[trackName].MIDI_CC, {
                        ccNumber: def.track_values[trackName].MIDI_CC,
                        name: def.track_values[trackName].label
                    })
                }
            })
        }

        if (def.CC_defs !== undefined) {
            let ccNames = Object.keys(def.CC_defs)
            ccNames.forEach(ccName => {
                let ccNumber = this.ccNameToNumber(ccName)
                ccMap.set(ccNumber, {
                    ccNumber,
                    name: def.CC_defs[ccName].label,
                    minValue: def.CC_defs[ccName].min_val,
                    maxValue: def.CC_defs[ccName].max_val,
                    startValue: def.CC_defs[ccName].start_val
                })
            })
        }

        this.midiCCs = []

        for (var i = 0; i < 128; i++) {
            let cc = ccMap.get(i)
            if (cc) {
                this.midiCCs.push(cc)
            }
        }

        return this
    }

    rowNameToNoteNumber(name: string): number {
        let keyList = [
            "C ", "C#", "D ", "D#", "E ", "F ", "F#", "G ", "G#", "A ", "A#", "B "
        ]
        if (name.length != 3) {
            return -1
        }
        let key = name.substr(0,2)
        let octave = parseInt(name.substr(2, 1))
        return (octave*12) + keyList.indexOf(key)
    }

    ccNameToNumber(name: string): number {
        return parseInt(name.substr(3))
    }
}

export class InstrumentDefinitionLoader {
    static async loadURL(url: string): Promise<CirklonInstrumentDefinitionFile> {
        let file = await fetch(url)
        let json = await file.text()

        return JSON.parse(json) as CirklonInstrumentDefinitionFile
    }

    static parseFile(file: CirklonInstrumentDefinitionFile): InstrumentDefinition[] {
        return Object.keys(file.instrument_data).map(name => {
            return new InstrumentDefinition(name).parseDefinition(file.instrument_data[name])
        })
    }
}