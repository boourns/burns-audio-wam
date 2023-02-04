// ----- Uniform ----- //

import { VideoExtensionOptions } from "wam-extensions"
import * as THREE from 'three';
import { ThreeJSGenerator } from "./ThreeJSGenerator";

export class ThreeJSRunner {
    options: VideoExtensionOptions
    output?: WebGLTexture

    constructor(options: VideoExtensionOptions) {
        this.options = options

        this.setup(options.gl)
    }

    destroy() {
        this.texture.dispose()
        this.renderer.setRenderTarget(null)
    }

    renderer: THREE.WebGLRenderer
    texture: THREE.WebGLRenderTarget

    setup(gl: WebGLRenderingContext) {
        const renderer = new THREE.WebGLRenderer( { antialias: true, context: gl } );
        renderer.setSize( this.options.width, this.options.height );

        // Create the texture that will store our result
        var texture = new THREE.WebGLRenderTarget( this.options.width, this.options.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
 
        renderer.setRenderTarget(texture)

        this.renderer = renderer
        this.texture = texture
    }

    render(inputs: WebGLTexture[], generator: ThreeJSGenerator | undefined, time: number, params: Record<string, any>, fft: any): WebGLTexture[] {
        this.renderer.resetState()
        this.renderer.setRenderTarget(this.texture)

        if (generator) {
            // @ts-ignore
            generator.render(this.renderer, time, params, fft)
        }

        this.output = this.renderer.properties.get(this.texture.texture).__webglTexture

        return [this.output!]
    }
}