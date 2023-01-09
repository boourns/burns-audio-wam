//import crt from "./shaders/CRT-beam.json"
import { VideoExtensionOptions } from "wam-extensions"
//import crt from "./shaders/crtglow_gauss.json"
//import crt from "./shaders/nearest.json"
import crt from "./shaders/vhs.json"

export class GLSLPPlayer {
    gl: WebGL2RenderingContext

    billboard: Rect

    options: VideoExtensionOptions
    frameCount: number

    constructor(options: VideoExtensionOptions) {
        this.programs = []
        this.options = options

        this.gl = options.gl
        this.billboard = new Rect(options.gl);

        this.frameCount = 0
        
        this.compile(crt)
    }

    compile(preset: any) {
        const count = parseInt(preset["shaders"])
        if (!Number.isInteger(count)) {
            throw new Error(`'shaders' count not number, was ${preset["shaders"]}`)
        }

        for (let i = 0; i < count; i++) {
            this.programs.push(this.compileShader(preset[`shader${i}`], preset))
        }
    }

    compileShader(script: string, preset: any): ShaderPass {        
        var program = this.gl.createProgram();
        if (program == null) {
            throw new Error("failed to create Program")
        }

        let shader = script.split("\n").filter(l => !l.match(/#pragma[^s]+parameter/)).join("\n")
        
        this.addShader(program, "#define VERTEX 1.0\n" + shader, this.gl.VERTEX_SHADER )
        this.addShader(program, "#define FRAGMENT 1.0\n" + shader, this.gl.FRAGMENT_SHADER )
        debugger


        this.gl.linkProgram( program )
        this.gl.useProgram( program )

        const texture = this.gl.createTexture();

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.options.width, this.options.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        // Create the framebuffer object and bind it
        const fbo = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);

        // Attach the texture to the framebuffer as the color attachment
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);

        // Set up your shaders and rendering as you normally would, but render to the framebuffer object
        // instead of the canvas

        // When you are finished rendering, unbind the framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);


        return {program, texture, fbo}
    }

    setResolution(name: string, program: WebGLProgram) {
        const pos = this.gl.getAttribLocation( program, name );
        if (pos != -1) {
            this.gl.uniform2f(pos, this.options.width, this.options.height)
        }
    }

    render(inputs: WebGLTexture[], currentTime: number): WebGLTexture[] {
        if (inputs.length == 0) {
            return []
        }
        let input = inputs[0]
        this.frameCount++

        for (let entry of this.programs) {
            const program = entry.program
            this.gl.useProgram(program);

            const matrixLocation = this.gl.getUniformLocation(program, "MVPMatrix")
            if (matrixLocation != -1) {
                const matrix = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                  ]);
        
                this.gl.uniformMatrix4fv(matrixLocation, false, matrix);
            }

            const texturePos = this.gl.getUniformLocation(program, "Texture")
            this.gl.bindTexture(this.gl.TEXTURE_2D, input)
            this.gl.uniform1i(texturePos, 0);

            const framePos = this.gl.getUniformLocation(program, "FrameCount")
            this.gl.uniform1i(framePos, this.frameCount);
            const dirPos = this.gl.getUniformLocation(program, "FrameDirection")
            this.gl.uniform1i(dirPos, 1.0);

            this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.billboard!.buffer );
            const texPos = this.gl.getAttribLocation( program, 'TexCoord' )
            this.gl.enableVertexAttribArray( texPos );
            this.gl.vertexAttribPointer( texPos, 2, this.gl.FLOAT, false, 0, 0 );
            
            const pos = this.gl.getAttribLocation( program, 'VertexCoord' )
            this.gl.enableVertexAttribArray( pos );
            this.gl.vertexAttribPointer( pos, 2, this.gl.FLOAT, false, 0, 0 );

            this.setResolution("InputSize", program)
            this.setResolution("TextureSize", program)
            this.setResolution("OutputSize", program)

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, entry.fbo)

            this.billboard!.render();
    
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

            this.gl.bindTexture(this.gl.TEXTURE_2D, null)

            input = entry.texture
        }
        
        this.gl.useProgram( null ); 

        return [input]
    }

    addShader(program: WebGLProgram, source: string, type: number) {

        console.log("WOOF ====")
        console.log(source.split("\n").map((l, i) => `${i}: ${l}`))

        let gl = this.gl
        var shader = gl.createShader( type );
        if (shader == null) {
            throw new Error( 'createShader returned null' );
        }
        gl.shaderSource( shader, source );
        gl.compileShader( shader );
        var isCompiled = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
        if ( !isCompiled ) {
          throw new Error( 'Shader compile error: ' + gl.getShaderInfoLog( shader ) );
        }
        gl.attachShader(program, shader );
    }
}

class Rect {
    gl: WebGL2RenderingContext
    verts: Float32Array
    buffer: WebGLBuffer

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl
        this.buffer = gl.createBuffer()!;
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
        this.verts = new Float32Array([
            0, 0,
            1, 0,
            0,  1,
            1,  1,
        ]);
        gl.bufferData( gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW );
    }

    render() {
        this.gl.drawArrays( this.gl.TRIANGLE_STRIP, 0, 4 );
    }

}