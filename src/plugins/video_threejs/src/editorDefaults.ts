import three from "./types/three.txt"
import generator from "./types/ThreeJSGenerator.txt"

export function defaultScript(): string {
    return `
    

/** 
 * @class
 * @implements {ThreeJSGenerator} 
 * */
class CubeGenerator {
	/**
	 * @returns {ParameterDefinition[]}
	 */
	parameters() {
		return [
			{
				id: "pos",
				config: {
					label: "Position",
					type: "float",
					defaultValue: 0,
					minValue: -2,
					maxValue: 2
				}
			},
			{
				id: "speed",
				config: {
					label: "Cube Speed",
					type: "float",
					defaultValue: 1,
					minValue: 0.1,
					maxValue: 3
				}
			}
		]
	}

	/**
	 * @param time {number} current time in seconds
	 * @param options {VideoExtensionOptions}
	 * */
	initialize(time, options) {
		this.THREE = THREE
		this.options = options

		const camera = new THREE.PerspectiveCamera( 70, options.width / options.height, 0.01, 10 );
        camera.position.z = 1;

        const scene = new THREE.Scene();

        const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
        const material = new THREE.MeshNormalMaterial();

        const mesh = new THREE.Mesh( geometry, material );

        scene.add( mesh );

		this.scene = scene
		this.camera = camera
		this.mesh = mesh
	}

	/**
	 * @param time {number}
	 * @param params {Record<string, any>}
	 * */
	render(renderer, time, params) {
		this.mesh.position.setZ(params.pos);
		     
		this.mesh.rotation.x += params.speed/ 100;
		this.mesh.rotation.y += (params.speed / 100);
		
		renderer.render( this.scene, this.camera);
	}

	destroy() {
		if (this.camera) {
            this.camera.remove()
        }
        if (this.light) {
            this.light.remove()
        }
        if (this.scene) {
            this.scene.dispose()
        }
	}
}

return new CubeGenerator()
`
}

export function editorDefinition() {
	return `

	declare namespace THREE {
	${three}
	class SphereBufferGeometry extends SphereGeometry{}
	class TetrahedronBufferGeometry extends TetrahedronGeometry {}
	class TorusBufferGeometry extends TorusGeometry {}
	class TorusKnotBufferGeometry extends TorusKnotGeometry {}
	class TubeBufferGeometry extends TubeGeometry {}
	class BoxBufferGeometry extends BoxGeometry {}
	class CircleBufferGeometry extends CircleGeometry {}
	class ConeBufferGeometry extends ConeGeometry {}
	class CylinderBufferGeometry extends CylinderGeometry {}
	class DodecahedronBufferGeometry extends DodecahedronGeometry {}
	class IcosahedronBufferGeometry extends IcosahedronGeometry {}
	class LatheBufferGeometry extends LatheGeometry {}
	class OctahedronBufferGeometry extends OctahedronGeometry {}
	class PlaneBufferGeometry extends PlaneGeometry {}
	class PolyhedronBufferGeometry extends PolyhedronGeometry {}
	class RingBufferGeometry extends RingGeometry {}
	class ShapeBufferGeometry extends ShapeGeometry {}
	class ExtrudeBufferGeometry extends ExtrudeGeometry {}


	}

	${generator}

	`
}