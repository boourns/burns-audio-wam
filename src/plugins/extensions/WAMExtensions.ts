import { NoteExtension } from "./notes/NoteExtension";
import { PatternExtension } from "./patterns/PatternExtension";
import { ModulationTargetExtension } from "./modulationTarget/ModulationTargetExtension";


export type WAMExtensions = {
    notes?: NoteExtension
    patterns?: PatternExtension
    modulationTarget?: ModulationTargetExtension
}

declare global {
    interface Window { WAMExtensions: WAMExtensions; }
}

window.WAMExtensions = window.WAMExtensions || {};