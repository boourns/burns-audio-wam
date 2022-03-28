class ISFGLProgram {
  gl: WebGLRenderingContext;
  vShader: WebGLShader;
  fShader: WebGLShader;
  program: WebGLProgram;
  locations: {};
  buffer: WebGLBuffer;
  
  constructor(gl: WebGLRenderingContext, vs: string, fs: string) {
    this.gl = gl;
    this.vShader = this.createShader(vs, this.gl.VERTEX_SHADER);
    this.fShader = this.createShader(fs, this.gl.FRAGMENT_SHADER);
    this.program = this.createProgram(this.vShader, this.fShader);
    this.locations = {};
  }
  use() {
    this.gl.useProgram(this.program);
  }
  getUniformLocation(name: string) {
    return this.gl.getUniformLocation(this.program, name);
  }

  initVertices() {
    this.use();
    const positionLocation = this.gl.getAttribLocation(this.program, 'isf_position');
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);

    const vertexArray = new Float32Array(
      [-1.0, -1.0, 1.0,
      -1.0, -1.0, 1.0,
      -1.0, 1.0, 1.0,
      -1.0, 1.0, 1.0]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexArray, this.gl.STATIC_DRAW);

  }
  bindVertices() {
    this.use();
    const positionLocation = this.gl.getAttribLocation(this.program, 'isf_position');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
   
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
  }
  
  cleanup() {
    this.gl.deleteShader(this.fShader);
    this.gl.deleteShader(this.vShader);
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.buffer);
  }
  createShader(src: string, type: number) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    const compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
    if (!compiled) {
      const lastError = this.gl.getShaderInfoLog(shader);
      console.log('Error Compiling Shader ', lastError);

      // @ts-ignore
      throw new Error({
        message: lastError,
        type: 'shader',
      });
    }
    return shader;
  }
  createProgram(vShader: WebGLShader, fShader: WebGLShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vShader);
    this.gl.attachShader(program, fShader);
    this.gl.linkProgram(program);
    const linked = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
    if (!linked) {
      const lastError = this.gl.getProgramInfoLog(program);
      console.log('Error in program linking', lastError);

      // @ts-ignore
      throw new Error({
        message: lastError,
        type: 'program',
      });
    }
    return program;
  }
}








export default ISFGLProgram;
