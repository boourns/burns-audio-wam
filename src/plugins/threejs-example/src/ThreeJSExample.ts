// ----- Uniform ----- //

import { VideoExtensionOptions } from "wam-extensions"
import * as THREE from 'three';

export class ThreeJSExample {
    options: VideoExtensionOptions

    input?: WebGLTexture
    output?: WebGLTexture

    constructor(options: VideoExtensionOptions, input: WebGLTexture) {
        this.options = options
        this.input = input

        this.setup(options.gl)
    }

    mesh: THREE.Mesh
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.Camera
    texture: THREE.WebGLRenderTarget

    setup(gl: WebGLRenderingContext) {
        console.log("Calling setup")

        const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
        camera.position.z = 1;

        const scene = new THREE.Scene();

        const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
        const material = new THREE.MeshNormalMaterial();

        const mesh = new THREE.Mesh( geometry, material );
        scene.add( mesh );

    const renderer = new THREE.WebGLRenderer( { antialias: true, context: gl } );

        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setAnimationLoop( this.render.bind(this) );

        document.body.appendChild( renderer.domElement );

        // Create the texture that will store our result
        var texture = new THREE.WebGLRenderTarget( this.options.width, this.options.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
 
        console.log("finished setup")

        //renderer.setRenderTarget(texture)
        renderer.render( scene, camera);

        console.log(texture)

        this.output = renderer.properties.get(texture.texture).__webglTexture

        this.renderer = renderer
        this.camera = camera
        this.scene = scene
        this.mesh = mesh
        this.texture = texture

        console.log("Finished threejs setup!")
    }

    render(time: number) {
        if (!this.renderer) {
            return
        }
        this.mesh.rotation.x = time / 2000;
	    this.mesh.rotation.y = time / 1000;

        this.renderer.resetState()

	    this.renderer.render( this.scene, this.camera);
    }
    
}