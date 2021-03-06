// @ts-ignore
import math from 'mathjs-expression-parser';

import ISFGLState from './ISFGLState';
import ISFGLProgram from './ISFGLProgram';
import ISFBuffer from './ISFBuffer';
import ISFParser, { ISFUniformType } from './ISFParser';
import ISFTexture from './ISFTexture';
import LineMapper from './ISFLineMapper';

const mathJsEval = math.eval;

export class ISFRenderer {
  gl: WebGLRenderingContext;
  contextState: ISFGLState
  uniforms: Record<string, any>;
  startTime: number;
  lastRenderTime: number;
  frameIndex: number;
  fragmentShader: string;
  vertexShader: string;
  model: ISFParser;
  valid: boolean;
  error: any;
  errorLine: any;
  program: ISFGLProgram;
  paintProgram: ISFGLProgram;
  basicVertexShader: string;
  basicFragmentShader: string;
  renderBuffers: any[];

  outputFramebuffer: WebGLFramebuffer;
  outputTexture: WebGLTexture;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
    this.uniforms = [];
    this.contextState = new ISFGLState(this.gl);
    this.setupPaintToScreen();
    this.startTime = Date.now();
    this.lastRenderTime = Date.now();
    this.frameIndex = 0;
  }

  loadSource(fragmentISF: string, vertexISFOpt?: string) {
    const parser = new ISFParser();
    parser.parse(fragmentISF, vertexISFOpt);
    this.sourceChanged(parser.fragmentShader, parser.vertexShader, parser);
  }

  sourceChanged(fragmentShader: string, vertexShader: string, model: ISFParser) {
    this.fragmentShader = fragmentShader;
    this.vertexShader = vertexShader;
    this.model = model;
    if (!this.model.valid) {
      this.valid = false;
      this.error = this.model.error;
      this.errorLine = this.model.errorLine;
      return;
    }
    try {
      this.valid = true;
      this.error = null;
      this.errorLine = null;
      this.setupGL();
      this.initUniforms();
      for (let i = 0; i < model.inputs.length; i++) {
        const input = model.inputs[i];
        if (input.DEFAULT !== undefined) {
          this.setValue(input.NAME, input.DEFAULT);
        }
      }
    } catch (e) {
      this.valid = false;
      this.error = e;
      this.errorLine = LineMapper(e, this.fragmentShader, this.model.rawFragmentShader);
    }
  }
  initUniforms() {
    this.uniforms = this.findUniforms(this.fragmentShader);
    const inputs = this.model.inputs;
    for (let i = 0; i < inputs.length; ++i) {
      const input = inputs[i];
      const uniform = this.uniforms[input.NAME];
      if (!uniform) {
        continue;
      }
      // @ts-ignore
      uniform.value = this.model[input.NAME];
      if (uniform.type === 't') {
        uniform.texture = new ISFTexture({}, this.contextState);
      }
    }
    this.pushTextures();
  }
  setValue(name:string, value:any, isTexture:boolean = false) {
    this.program.use();

    const uniform = this.uniforms[name];
    if (!uniform) {
      console.error(`No uniform named ${name}`);
      return;
    }
    uniform.value = value;
    if (uniform.type === 't') {
      uniform.textureLoaded = false;
      uniform.sourceIsTexture = isTexture;
    }
    this.pushUniform(uniform);
  }
  setNormalizedValue(name: string, normalizedValue: any) {
    const inputs = this.model.inputs;
    let input = null;
    for (let i = 0; i < inputs.length; i++) {
      const thisInput = inputs[i];
      if (thisInput.NAME === name) {
        input = thisInput;
        break;
      }
    }
    if (input && input.MIN !== undefined && input.MAX !== undefined) {
      this.setValue(name, input.MIN + (input.MAX - input.MIN) * normalizedValue);
    } else {
      console.log('Trying to set normalized value without MIN and MAX input', name, input);
    }
  }
  setupPaintToScreen() {
    this.paintProgram = new ISFGLProgram(this.gl, this.basicVertexShader, this.basicFragmentShader);
    return this.paintProgram.initVertices();
  }
  setupGL() {
    this.cleanup();
    this.program = new ISFGLProgram(this.gl, this.vertexShader, this.fragmentShader);
    this.program.initVertices();
    this.generatePersistentBuffers();
  }
  generatePersistentBuffers() {
    this.renderBuffers = [];
    const passes = this.model.passes;
    for (let i = 0; i < passes.length; ++i) {
      const pass = passes[i];
      const buffer = new ISFBuffer(pass, this.contextState);
      pass.buffer = buffer;
      this.renderBuffers.push(buffer);
    }
  }
  paintToScreen(destination: { width: number; height: number; }, target: ISFBuffer) {
    this.paintProgram.use();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, destination.width, destination.height);
    const loc = this.paintProgram.getUniformLocation('tex');
    target.readTexture().bind(loc);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.program.use();
  }
  pushTextures() {
    Object.keys(this.uniforms).forEach((u) => {
      const uniform = this.uniforms[u];
      if (uniform.type === 't')
        this.pushTexture(uniform);
    });
  }
  pushTexture(uniform: any) {
    if (!uniform.value) {
      return;
    }

    const loc = this.program.getUniformLocation(uniform.name);

    if (!uniform.sourceIsTexture) {
      if (uniform.value.constructor.name !== 'OffscreenCanvas' &&
        (
          uniform.value.tagName !== 'CANVAS' &&
          !uniform.value.complete &&
          uniform.value.readyState !== 4)) {
        return;
      }

      uniform.texture.bind(loc);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, uniform.value);
      if (!uniform.textureLoaded) {
        const img = uniform.value;
        uniform.textureLoaded = true;
        const w = img.naturalWidth || img.width || img.videoWidth;
        const h = img.naturalHeight || img.height || img.videoHeight;
        this.setValue(`_${uniform.name}_imgSize`, [w, h]);
        this.setValue(`_${uniform.name}_imgRect`, [0, 0, 1, 1]);
        this.setValue(`_${uniform.name}_flip`, false);
      }
    } else {
      uniform.texture.bind(loc, uniform.value);
    }
  }
  pushUniforms() {
    // @ts-ignore
    for (const uniform of this.uniforms) {
      this.pushUniform(uniform);
    }
  }
  pushUniform(uniform: any) {
    const loc = this.program.getUniformLocation(uniform.name);
    if (loc !== -1) {
      if (uniform.type === 't') {
        this.pushTexture(uniform);
        return;
      }
      const v = uniform.value;
      switch (uniform.type) {
        case 'f':
          this.gl.uniform1f(loc, v);
          break;
        case 'v2':
          this.gl.uniform2f(loc, v[0], v[1]);
          break;
        case 'v3':
          this.gl.uniform3f(loc, v[0], v[1], v[2]);
          break;
        case 'v4':
          this.gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
          break;
        case 'i':
          this.gl.uniform1i(loc, v);
          break;
        case 'color':
          this.gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
          break;
        default:
          console.log(`Unknown type for uniform setting ${uniform.type}`, uniform);
          break;
      }
    }
  }
  findUniforms(shader: string): Record<string, any> {
    const lines = shader.split('\n');
    const uniforms: Record<string, any> = {};
    const len = lines.length;
    for (let i = 0; i < len; ++i) {
      const line = lines[i].trim();
      if (line.indexOf('uniform') === 0) {
        const tokens = line.split(' ');
        const name = tokens[2].substring(0, tokens[2].length - 1);
        const uniform = this.typeToUniform(tokens[1]);
        uniform.name = name;
        uniforms[name] = uniform;
      }
    }
    return uniforms;
  }
  typeToUniform(type: string): any {
    switch (type) {
      case 'float':
        return {
          type: 'f',
          value: 0,
        };
      case 'vec2':
        return {
          type: 'v2',
          value: [0, 0],
        };
      case 'vec3':
        return {
          type: 'v3',
          value: [0, 0, 0],
        };
      case 'vec4':
        return {
          type: 'v4',
          value: [0, 0, 0, 0],
        };
      case 'bool':
        return {
          type: 'i',
          value: 0,
        };
      case 'int':
        return {
          type: 'i',
          value: 0,
        };
      case 'color':
        return {
          type: 'v4',
          value: [0, 0, 0, 0],
        };
      case 'point2D':
        return {
          type: 'v2',
          value: [0, 0],
          isPoint: true,
        };
      case 'sampler2D':
        return {
          type: 't',
          value: {
            complete: false,
            readyState: 0,
          },
          texture: null,
          textureUnit: null,
        };
      default:
        throw new Error(`Unknown uniform type in ISFRenderer.typeToUniform: ${type}`);
    }
  }
  setDateUniforms() {
    const now = Date.now();
    this.setValue('TIME', (now - this.startTime) / 1000);
    this.setValue('TIMEDELTA', (now - this.lastRenderTime) / 1000);
    this.setValue('FRAMEINDEX', this.frameIndex++);
    const date = new Date();
    this.setValue('DATE', [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()]);
    this.lastRenderTime = now;
  }
  draw(width: number, height: number): WebGLTexture | undefined {
    this.contextState.reset();
    this.program.use();
    this.program.bindVertices();
    this.setDateUniforms();

    const buffers = this.renderBuffers;
    for (let i = 0; i < buffers.length; ++i) {
      const buffer = buffers[i];
      const readTexture = buffer.readTexture();
      const loc = this.program.getUniformLocation(buffer.name);
      readTexture.bind(loc);
      if (buffer.name) {
        this.setValue(`_${buffer.name}_imgSize`, [buffer.width, buffer.height]);
        this.setValue(`_${buffer.name}_imgRect`, [0, 0, 1, 1]);
        this.setValue(`_${buffer.name}_flip`, false);
      }
    }
    let lastTarget = null;
    const passes = this.model.passes;
    for (let i = 0; i < passes.length; ++i) {
      const pass = passes[i];
      this.setValue('PASSINDEX', i);
      const buffer = pass.buffer;
      if (pass.target) {
        const w = this.evaluateSize(width, height, pass.width);
        const h = this.evaluateSize(width, height, pass.height);
        buffer.setSize(w, h);
        const writeTexture = buffer.writeTexture();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, buffer.fbo);
        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0,
          this.gl.TEXTURE_2D,
          writeTexture.texture,
          0);
        this.setValue('RENDERSIZE', [buffer.width, buffer.height]);
        lastTarget = buffer;
        this.gl.viewport(0, 0, w, h);
      } else {
        if (!this.outputFramebuffer) {
          throw new Error("Must call this.setupOutput first!")
        }
        const renderWidth = width;
        const renderHeight = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.outputFramebuffer);
        this.setValue('RENDERSIZE', [renderWidth, renderHeight]);
        lastTarget = null;
        this.gl.viewport(0, 0, renderWidth, renderHeight);
      }
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

      this.gl.bindTexture(this.gl.TEXTURE_2D, this.outputTexture);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    for (let i = 0; i < buffers.length; ++i) {
      buffers[i].flip();
    }
    if (lastTarget) {
      // this happens only if we had a multi-pass render
      return lastTarget.readTexture().texture
    } else {
      return this.outputTexture;
    }
  }

  setupOutput(width: number, height: number) {
    let gl = this.gl

    // The framebuffer, which regroups 0, 1, or more textures, and 0 or 1 depth buffer.
    this.outputFramebuffer = gl.createFramebuffer();
    
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.outputFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.outputTexture = texture
  }

  evaluateSize(width: number, height: number, formula: string) {
    formula += '';
    let s = formula.replace('$WIDTH', `${width}`).replace('$HEIGHT', `${height}`);
    for (const name in this.uniforms) {
      if ({}.hasOwnProperty.call(this.uniforms, name)) {
        const uniform = this.uniforms[name];
        s = s.replace(`$${name}`, uniform.value);
      }
    }

    return mathJsEval(s);
  }
  
  cleanup() {
    this.contextState.reset();
    if (this.renderBuffers) {
      for (let i = 0; i < this.renderBuffers.length; ++i) {
        this.renderBuffers[i].destroy();
      }
    }
  }
}




















ISFRenderer.prototype.basicVertexShader = "precision mediump float;\nprecision mediump int;\nattribute vec2 isf_position; // -1..1\nvarying vec2 texCoord;\n\nvoid main(void) {\n  // Since webgl doesn't support ftransform, we do this by hand.\n  gl_Position = vec4(isf_position, 0, 1);\n  texCoord = isf_position;\n}\n";

ISFRenderer.prototype.basicFragmentShader = 'precision mediump float;\nuniform sampler2D tex;\nvarying vec2 texCoord;\nvoid main()\n{\n  gl_FragColor = texture2D(tex, texCoord * 0.5 + 0.5);\n  //gl_FragColor = vec4(texCoord.x);\n}';

export default ISFRenderer;
