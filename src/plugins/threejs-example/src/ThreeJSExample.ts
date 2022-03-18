// ----- Uniform ----- //

import { VideoExtensionOptions } from "wam-extensions"
import * as THREE from 'three';

export class ThreeJSExample {
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

    mesh: THREE.Mesh
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.Camera
    texture: THREE.WebGLRenderTarget

    setup(gl: WebGLRenderingContext) {
        const camera = new THREE.PerspectiveCamera( 70, this.options.width / this.options.height, 0.01, 10 );
        camera.position.z = 1;

        const scene = new THREE.Scene();

        const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
        const material = new THREE.MeshNormalMaterial();

        const mesh = new THREE.Mesh( geometry, material );

        scene.add( mesh );

        const renderer = new THREE.WebGLRenderer( { antialias: true, context: gl } );

        renderer.setSize( this.options.width, this.options.height );

        // Create the texture that will store our result
        var texture = new THREE.WebGLRenderTarget( this.options.width, this.options.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
 
        renderer.setRenderTarget(texture)
        renderer.render( scene, camera);

        scene.add( mesh );

        this.renderer = renderer
        this.camera = camera
        this.scene = scene
        this.mesh = mesh
        this.texture = texture
    }

    count = 0

    render(inputs: WebGLTexture[], time: number, offset: number): WebGLTexture[] {
        this.renderer.resetState()
        this.renderer.setRenderTarget(this.texture)

        this.output = this.renderer.properties.get(this.texture.texture).__webglTexture

        this.mesh.position.setX(offset);
        
        this.mesh.rotation.x = (time+856) / 2;
	    this.mesh.rotation.y = time / 10;

	    this.renderer.render( this.scene, this.camera);

        return [this.output!]
    }
    
}