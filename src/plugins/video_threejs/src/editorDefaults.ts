export function defaultScript(): string {
    return `
    

/** @implements {ThreeJSGenerator} */
class CubeGenerator {
	/**
	 * @returns {WAMParameterDefinition[]}
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

	initialize(THREE, options) {
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
	 * @param tick {number}
	 * @param params {Record<string, any>}
	 * */
	render(renderer, time, params) {
		this.mesh.position.setZ(params.pos);
		     
		this.mesh.rotation.x += params.speed/ 100;
		this.mesh.rotation.y += (params.speed / 100);
		
		renderer.render( this.scene, this.camera);
	}
}

return new CubeGenerator()
`
}