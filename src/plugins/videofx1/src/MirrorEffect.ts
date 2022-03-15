// ----- Uniform ----- //

import { WamParameterDataMap } from "@webaudiomodules/api"
import { VideoExtensionOptions } from "wam-extensions"

const glsl = (x:any) => x;

class Uniform {
    gl: WebGLRenderingContext
    program: WebGLProgram
    name: string
    suffix: string
    location: WebGLUniformLocation

    constructor(gl: WebGLRenderingContext, program: WebGLProgram, name: string, suffix: string) {
        this.gl = gl
        this.program = program
        this.name = name;
        this.suffix = suffix;
        this.location = gl.getUniformLocation( program, name );
    }

    set(...values: number[]) {
        var method = 'uniform' + this.suffix;
        var args = [ this.location ].concat( values );
        // @ts-ignore
        this.gl[ method ].apply( this.gl, args );
    }
}

// ----- Rect ----- //
class Rect {
    gl: WebGLRenderingContext
    verts: Float32Array
    buffer: WebGLBuffer

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl
        this.buffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
        this.verts = new Float32Array([
            -1, -1,
            1, -1,
            -1,  1,
            1,  1,
        ]);
        gl.bufferData( gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW );
    }

    render() {
        
        this.gl.drawArrays( this.gl.TRIANGLE_STRIP, 0, 4 );
    }

}

export class MirrorEffect {
    options: VideoExtensionOptions
    program: WebGLProgram
    billboard: Rect

    startTime: number
    uResolution: Uniform
    uTime: Uniform

    uPosition: Uniform
    uDimensions: Uniform   

    input?: WebGLTexture
    output?: WebGLTexture
    framebuffer?: WebGLFramebuffer

    positionLocation: number

    constructor(options: VideoExtensionOptions, input: WebGLTexture) {
        this.options = options
        this.input = input

        this.setup(options.gl)
    }

    setup(gl: WebGLRenderingContext) {
        console.log("Calling setup")

        // create program
        var program = gl.createProgram();
        this.program = program

        // add shaders
        var vertexShaderSource = this.vertexShader()
        var fragmentShaderSource = this.fragmentShader()

        this.addShader( vertexShaderSource, gl.VERTEX_SHADER );
        this.addShader( fragmentShaderSource, gl.FRAGMENT_SHADER );

        // link & use program
        gl.linkProgram( program );
        gl.useProgram( program );

        // create fragment uniforms
        this.uResolution = new Uniform( gl, program, 'u_resolution', '2f' );
        this.uTime = new Uniform(gl, program, 'u_time', '1f' );

        this.uPosition = new Uniform(gl, program, 'u_position', '2f' );
        this.uDimensions = new Uniform(gl, program, 'u_dimensions', '2f' );

        // create position attrib
        this.billboard = new Rect( gl );

        // we want to render to a texture, not to the canvas
        this.setupOutput()

        this.startTime = new Date().getTime();
        this.resize();

        console.log("finished setup")
    }

    setupOutput() {
        let gl = this.options.gl

        // The framebuffer, which regroups 0, 1, or more textures, and 0 or 1 depth buffer.
        this.framebuffer = gl.createFramebuffer();
        
        const texture = gl.createTexture();
 
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.options.width, this.options.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.output = texture
    }

    render(inputs: WebGLTexture[], currentTime: number, params: WamParameterDataMap): WebGLTexture[] {
        let gl = this.options.gl;

        gl.useProgram( this.program );

        this.uTime.set( currentTime );
        if (params && params.width) {
            this.uDimensions.set(params.width.value, params.height.value)
            this.uPosition.set(params.centerX.value, params.centerY.value)
        } else {
            this.uDimensions.set(1.0, 1.0)
            this.uPosition.set(0.5, 0.5)
        }

        gl.enableVertexAttribArray( this.positionLocation );

        gl.bindBuffer( gl.ARRAY_BUFFER, this.billboard.buffer );
        gl.vertexAttribPointer( this.positionLocation, 2, gl.FLOAT, false, 0, 0 );

        // bind input after binding output?
        gl.bindTexture(gl.TEXTURE_2D, inputs[0]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

        // render
        this.billboard.render();

        gl.bindTexture(gl.TEXTURE_2D, this.output);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return [this.output]
    }
        
    // ----- resize ----- //    
    resize() {
        this.uResolution.set( this.options.width, this.options.height );
        this.options.gl.viewport( 0, 0, this.options.width, this.options.height );
    }

    addShader(source: string, type: number) {
        let gl = this.options.gl
        var shader = gl.createShader( type );
        gl.shaderSource( shader, source );
        gl.compileShader( shader );
        var isCompiled = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
        if ( !isCompiled ) {
          throw new Error( 'Shader compile error: ' + gl.getShaderInfoLog( shader ) );
        }
        gl.attachShader(this.program, shader );
    }

    fragmentShader(): string {
        return glsl`
#ifdef GL_ES
  precision mediump float;
#endif

uniform sampler2D texture;
uniform vec2 u_resolution;

uniform vec2 u_position;
uniform vec2 u_dimensions;


void main() {
    vec2 src = gl_FragCoord.xy / u_resolution;
    vec2 origin = vec2(0.5, 0.5);
    vec2 flip = vec2(-1.0, -1.0);

    vec2 dst;
    dst.x = src.x;
    if (dst.x > 0.5) {
        dst.x = 1.0 - dst.x;
    }
    dst.y = src.y;
    if (dst.y > 0.5) {
        dst.y = 1.0 - dst.y;
    }
    
    gl_FragColor = texture2D(texture, dst);
}
        `
    }

    vertexShader(): string {
        return `
attribute vec2 a_position;

void main() {
  gl_Position = vec4( a_position, 0, 1 );
}
        `
    }
}