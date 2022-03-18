import ISFGLState from './ISFGLState';
import ISFTexture from './ISFTexture';

class ISFBuffer {
  contextState: ISFGLState;
  gl: WebGLRenderingContext;
  persistent: any;
  name: any;
  textures: ISFTexture[];
  flipFlop: boolean;
  fbo: any;
  width: number;
  height: number;

  constructor(pass: any, contextState: ISFGLState) {
    this.contextState = contextState;
    this.gl = this.contextState.gl;
    this.persistent = pass.persistent;
    // Since float buffers have a lot of problems in webgl we dont actually use them.
    // This should be revisited.
    // this.float = pass.float;
    this.name = pass.target;
    this.textures = [];
    this.textures.push(new ISFTexture(pass, this.contextState));
    this.textures.push(new ISFTexture(pass, this.contextState));
    this.flipFlop = false;
    this.fbo = this.gl.createFramebuffer();
    this.flipFlop = false;
  }
  setSize(w: number, h: number) {
    if (this.width !== w || this.height !== h) {
      this.width = w;
      this.height = h;
      for (let i = 0; i < this.textures.length; i++) {
        const texture = this.textures[i];
        texture.setSize(w, h);
      }
    }
  }
  readTexture() {
    if (this.flipFlop) {
      return this.textures[1];
    }
    return this.textures[0];
  }
  writeTexture() {
    if (!this.flipFlop) {
      return this.textures[1];
    }
    return this.textures[0];
  }
  flip() {
    this.flipFlop = !this.flipFlop;
  }
  destroy() {
    for (let i = 0; i < this.textures.length; i++) {
      const texture = this.textures[i];
      texture.destroy();
    }
    this.gl.deleteFramebuffer(this.fbo);
  }
}






export default ISFBuffer;
