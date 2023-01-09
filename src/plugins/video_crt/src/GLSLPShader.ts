
const valid_wrap_modes = ["clamp_to_border", "clamp_to_edge", "repeat", "mirrored_repeat"]

export type filter_modes = "FILTER_LINEAR" | "FILTER_NEAREST" | "FILTER_UNSPEC"

export type VideoShaderParameter = {
    pass: number
    current: number
    minimum: number
    initial: number
    maximum: number
    step: number
    id: string
    description: string
}

type FBOFlags = {
    srgb_fbo: boolean
    fp_fbo: boolean
}

type ShaderPass = {
    filter: filter_modes
    frame_count_mod?: number
    wrap: string
    fboFlags: FBOFlags
    mipmap: boolean

    texture: WebGLTexture
    program: WebGLProgram
    fbo: WebGLFramebuffer
}

type LookupTable = {
    filter: number
    wrap: any
    id: string
    path: string
    mipmap: boolean
}

export class GLSLPShader {
    parameters: VideoShaderParameter[]
    feedback_pass: number
    history_size: number

    passes: ShaderPass[]
    luts: LookupTable[]
    variables: number
    flags: boolean[]

    constructor() {
        this.passes = []
        this.luts = []
    }

    parse(shader: any) {

    }

    parsePass(shader: any, i: number): ShaderPass {
        let pass: Partial<ShaderPass> = {}

        const filter = shader[`filter_linear${i}`]
        if (filter === true) {
            pass.filter = "FILTER_LINEAR"
        } else if (filter === false) {
            pass.filter = "FILTER_NEAREST"
        } else {
            pass.filter = "FILTER_UNSPEC"
        }
        
        const wrap = shader[`wrap_mode${i}`]
        if (valid_wrap_modes.includes(wrap)) {
            pass.wrap = wrap
        }

        const frame_count_mod = shader[`frame_count_mod${i}`]
        if (Number.isInteger(frame_count_mod)) {
            pass.frame_count_mod = frame_count_mod
        }

        pass.fboFlags.srgb_fbo = !!shader[`srgb_framebuffer${i}`]
        pass.fboFlags.fp_fbo = !!shader[`fp_framebuffer${i}`]
        pass.mipmap = !!shader[`mipmap_input${i}`]

        const scale = shader[`scale_type${i}`]
        


        return pass
    }
}