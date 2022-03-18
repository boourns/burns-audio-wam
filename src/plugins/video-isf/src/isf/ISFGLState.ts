class ISFGLState {
  gl: WebGLRenderingContext;
  textureIndex: number;
  
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.textureIndex = 0;
  }
  newTextureIndex() {
    const i = this.textureIndex;
    this.textureIndex += 1;
    return i;
  }
  reset() {
    this.textureIndex = 0;
  }
}



export default ISFGLState;
