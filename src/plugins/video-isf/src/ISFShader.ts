import { WamParameterDataMap } from "@webaudiomodules/api";
import {ISFRenderer} from "./isf/ISFRenderer"
import {VideoExtensionOptions} from "wam-extensions"
import { DynamicParamEntry, DynamicParamGroup } from "../../shared/DynamicParameterNode";
import { ISFUniform } from "./isf/ISFParser";

export class ISFShader {
    options: VideoExtensionOptions
    renderer: ISFRenderer
    params: DynamicParamEntry[]

    constructor(options: VideoExtensionOptions, fragmentSrc:string, vertexSrc?: string) {
        this.renderer = new ISFRenderer(options.gl)
        this.renderer.setupOutput(options.width, options.height)
        this.options = options
        this.renderer.loadSource(this.edgesFS(), this.edgesVS());     
    }

    wamParameters(): DynamicParamGroup[] {
      let inputs = this.renderer.model.inputs.filter((u: ISFUniform) => u.TYPE != "image")

      let params: DynamicParamEntry[] = []

      for (let input of inputs) {
        switch(input.TYPE) {
          case "bool":
            params.push({
              id: input.NAME,
              config: {
                type: "boolean",
                defaultValue: !!input.DEFAULT ? 1 : 0,
                label: input.NAME,
              }
            })
            break
          case "float":
            params.push({
              id: input.NAME,
              config: {
                type: "float",
                defaultValue: input.DEFAULT as number,
                minValue: input.MIN,
                maxValue: input.MAX,
                label: input.NAME
              }
            })
            break
          case "long":
            params.push({
              id: input.NAME,
              config: {
                type: "int",
                defaultValue: input.DEFAULT as number,
                minValue: input.MIN,
                maxValue: input.MAX,
                label: input.NAME
              }
            })
            break
        }
      }

      this.params = params

      return [
        {
          name: "Parameters",
          params
        }
      ]
      
    }

    render(inputs: WebGLTexture[], currentTime: number, params: WamParameterDataMap): WebGLTexture[] {
        this.renderer.setValue("TIME", currentTime)
        
        this.renderer.setValue("inputImage", inputs[0], true)
        this.renderer.setValue(`_inputImage_imgSize`, [this.options.width, this.options.height]);
        this.renderer.setValue(`_inputImage_imgRect`, [0, 0, 1, 1]);
        this.renderer.setValue(`_inputImage_flip`, false);
        
        for (let p of this.params) {
          this.renderer.setValue(p.id, params[p.id].value)
        }
        
        let output = this.renderer.draw(this.options.width, this.options.height)
        return [output]
    }

    exampleISF2(): string {
        return `
        /*{
            "CREDIT": "by VIDVOX",
            "CATEGORIES": [
                "Glitch"
            ],
            "INPUTS": [
                {
                    "NAME": "inputImage",
                    "TYPE": "image"
                }
            ]
        }*/
        
        //	Adapted from http://www.airtightinteractive.com/demos/js/badtvshader/js/BadTVShader.js
        //	Also uses adopted Ashima WebGl Noise: https://github.com/ashima/webgl-noise
        
        /*
         * The MIT License
         *
         * Copyright (c) 2014 Felix Turner
         *
         * Permission is hereby granted, free of charge, to any person obtaining a copy
         * of this software and associated documentation files (the "Software"), to deal
         * in the Software without restriction, including without limitation the rights
         * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
         * copies of the Software, and to permit persons to whom the Software is
         * furnished to do so, subject to the following conditions:
         *
         * The above copyright notice and this permission notice shall be included in
         * all copies or substantial portions of the Software.
         *
         * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
         * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
         * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
         * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
         * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
         * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
         * THE SOFTWARE.
         *
        */
        
        
        // Start Ashima 2D Simplex Noise
        
        void main() {
            
            //gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
        
            vec2 adjusted = isf_FragNormCoord;

            vec4 result = IMG_NORM_PIXEL(inputImage, adjusted);
            gl_FragColor = result;
        }
        `
    }

    exampleISF(): string {
        return `
        /*{
            "CREDIT": "by VIDVOX",
            "CATEGORIES": [
                "Glitch"
            ],
            "INPUTS": [
                {
                    "NAME": "inputImage",
                    "TYPE": "image"
                },
                {
                    "NAME": "noiseLevel",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 1.0,
                    "DEFAULT": 0.5
                },
                {
                    "NAME": "distortion1",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 5.0,
                    "DEFAULT": 1.0
                },
                {
                    "NAME": "distortion2",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 5.0,
                    "DEFAULT": 5.0
                },
                {
                    "NAME": "speed",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 1.0,
                    "DEFAULT": 0.3
                },
                {
                    "NAME": "scroll",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 1.0,
                    "DEFAULT": 0.0
                },
                {
                    "NAME": "scanLineThickness",
                    "TYPE": "float",
                    "MIN": 1.0,
                    "MAX": 50.0,
                    "DEFAULT": 25.0
                },
                {
                    "NAME": "scanLineIntensity",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 1.0,
                    "DEFAULT": 0.5
                },
                {
                    "NAME": "scanLineOffset",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 1.0,
                    "DEFAULT": 0.0
                }
            ]
        }*/
        
        //	Adapted from http://www.airtightinteractive.com/demos/js/badtvshader/js/BadTVShader.js
        //	Also uses adopted Ashima WebGl Noise: https://github.com/ashima/webgl-noise
        
        /*
         * The MIT License
         *
         * Copyright (c) 2014 Felix Turner
         *
         * Permission is hereby granted, free of charge, to any person obtaining a copy
         * of this software and associated documentation files (the "Software"), to deal
         * in the Software without restriction, including without limitation the rights
         * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
         * copies of the Software, and to permit persons to whom the Software is
         * furnished to do so, subject to the following conditions:
         *
         * The above copyright notice and this permission notice shall be included in
         * all copies or substantial portions of the Software.
         *
         * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
         * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
         * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
         * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
         * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
         * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
         * THE SOFTWARE.
         *
        */
        
        
        // Start Ashima 2D Simplex Noise
        
        const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec2 mod289(vec2 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec3 permute(vec3 x) {
            return mod289(((x*34.0)+1.0)*x);
        }
        
        float snoise(vec2 v)	{
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
        
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
        
            i = mod289(i); // Avoid truncation effects in permutation
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))+ i.x + vec3(0.0, i1.x, 1.0 ));
        
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
        
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
        
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }
        
        // End Ashima 2D Simplex Noise
        
        const float tau = 6.28318530718;
        
        //	use this pattern for scan lines
        
        vec2 pattern(vec2 pt) {
            float s = 0.0;
            float c = 1.0;
            vec2 tex = pt * RENDERSIZE;
            vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * (1.0/scanLineThickness);
            float d = point.y;
        
            return vec2(sin(d + scanLineOffset * tau + cos(pt.x * tau)), cos(d + scanLineOffset * tau + sin(pt.y * tau)));
        }
        
        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }
        
        void main() {
            vec2 p = isf_FragNormCoord;
            float ty = TIME*speed;
            float yt = p.y - ty;
        
            //smooth distortion
            float offset = snoise(vec2(yt*3.0,0.0))*0.2;
            // boost distortion
            offset = pow( offset*distortion1,3.0)/max(distortion1,0.001);
            //add fine grain distortion
            offset += snoise(vec2(yt*50.0,0.0))*distortion2*0.001;
            //combine distortion on X with roll on Y
            vec2 adjusted = vec2(fract(p.x + offset),fract(p.y-scroll) );
            vec4 result = IMG_NORM_PIXEL(inputImage, adjusted);
            vec2 pat = pattern(adjusted);
            vec3 shift = scanLineIntensity * vec3(0.3 * pat.x, 0.59 * pat.y, 0.11) / 2.0;
            result.rgb = (1.0 + scanLineIntensity / 2.0) * result.rgb + shift + (rand(adjusted * TIME) - 0.5) * noiseLevel;
            gl_FragColor = result;
        
        }
        `
    }

    complexFeedbackExample(): string {
        return `
        /*{
            "DESCRIPTION": "Buffers 8 recent frames",
            "CREDIT": "by VIDVOX",
            "CATEGORIES": [
              "Glitch"
            ],
            "INPUTS": [
              {
                "NAME": "inputImage",
                "TYPE": "image"
              },
              {
                "NAME": "inputDelay",
                "LABEL": "Buffer",
                "TYPE": "color",
                "DEFAULT": [
                  0.25,
                  0.5,
                  0.75,
                  0.5
                ]
              },
              {
                "NAME": "inputRate",
                "LABEL": "Buffer Lag",
                "TYPE": "float",
                "MIN": 1.0,
                "MAX": 20.0,
                "DEFAULT": 4.0
              },
              {
                "NAME": "glitch_size",
                "LABEL": "Size",
                "TYPE": "float",
                "MIN": 0.0,
                "MAX": 0.5,
                "DEFAULT": 0.1
              },
              {
                "NAME": "glitch_horizontal",
                "LABEL": "Horizontal Amount",
                "TYPE": "float",
                "MIN": 0.0,
                "MAX": 1.0,
                "DEFAULT": 0.2
              },
              {
                "NAME": "glitch_vertical",
                "LABEL": "Vertical Amount",
                "TYPE": "float",
                "MIN": 0.0,
                "MAX": 1.0,
                "DEFAULT": 0.0
              },
              {
                "NAME": "randomize_size",
                "LABEL": "Randomize Size",
                "TYPE": "bool",
                "DEFAULT": 1.0
              },
              {
                "NAME": "randomize_position",
                "LABEL": "Randomize Position",
                "TYPE": "bool",
                "DEFAULT": 0.0
              },
              {
                "NAME": "randomize_zoom",
                "LABEL": "Randomize Zoom",
                "TYPE": "bool",
                "DEFAULT": 0.0
              }
            ],
            "PERSISTENT_BUFFERS": [
              "lastRow",
              "buffer1",
              "buffer2",
              "buffer3",
              "buffer4",
              "buffer5",
              "buffer6",
              "buffer7",
              "buffer8"
            ],
            "PASSES": [
              {
                "TARGET":"lastRow",
                "WIDTH:": 1,
                "HEIGHT": 1,
                "DESCRIPTION": "this buffer stores the last frame's odd / even state"
              },
              {
                "TARGET":"buffer8"
              },
              {
                "TARGET":"buffer7"
              },
              {
                "TARGET":"buffer6"
              },
              {
                "TARGET":"buffer5"
              },
              {
                "TARGET":"buffer4"
              },
              {
                "TARGET":"buffer3"
              },
              {
                "TARGET":"buffer2"
              },
              {
                "TARGET":"buffer1"
              },
              {
          
              }
            ]
          
          }*/
          
          
          float rand(vec2 co){
              return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
          }
          
          
          void main()
          {
            //	first pass: read the "buffer7" into "buffer8"
            //	apply lag on each pass
            //	if this is the first pass, i'm going to read the position from the "lastRow" image, and write a new position based on this and the hold variables
            if (PASSINDEX == 0)	{
              vec4		srcPixel = IMG_PIXEL(lastRow,vec2(0.5));
              //	i'm only using the X and Y components, which are the X and Y offset (normalized) for the frame
              if (inputRate == 0.0)	{
                srcPixel.x = 0.0;
                srcPixel.y = 0.0;
              }
              else if (inputRate <= 1.0)	{
                srcPixel.x = (srcPixel.x) > 0.5 ? 0.0 : 1.0;
                srcPixel.y = 0.0;
              }
              else {
                srcPixel.x = srcPixel.x + 1.0 / inputRate + srcPixel.y;
                if (srcPixel.x > 1.0)	{
                  srcPixel.y = mod(srcPixel.x, 1.0);
                  srcPixel.x = 0.0;
                }
              }
              gl_FragColor = srcPixel;
            }
            if (PASSINDEX == 1)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer7);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer8);
              }
            }
            else if (PASSINDEX == 2)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer6);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer7);
              }
            }
            else if (PASSINDEX == 3)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer5);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer6);
              }
            }
            else if (PASSINDEX == 4)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer4);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer5);
              }
            }
            else if (PASSINDEX == 5)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer3);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer4);
              }
            }
            else if (PASSINDEX == 6)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer2);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer3);
              }
            }
            else if (PASSINDEX == 7)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer1);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer2);
              }
            }
            else if (PASSINDEX == 8)	{
              vec4		lastRow = IMG_PIXEL(lastRow,vec2(0.5));
              if (lastRow.x == 0.0)	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(inputImage);
              }
              else	{
                gl_FragColor = IMG_THIS_NORM_PIXEL(buffer1);
              }
            }
            else if (PASSINDEX == 9)	{
              //	Figure out which section I'm in and draw the appropriate buffer there
              vec2 tex = isf_FragNormCoord;
              vec4 color = vec4(0.0);
              //	figure out the "input delay shift" for this pixel...
              float randomDelayShift = 0.0;
          
              vec2 xy;
              xy.x = isf_FragNormCoord[0];
              xy.y = isf_FragNormCoord[1];
          
              //	quantize the xy to the glitch_amount size
              //xy = floor(xy / glitch_size) * glitch_size;
              vec2 random;
          
              float local_glitch_size = glitch_size;
              float random_offset = 0.0;
          
              if (randomize_size)	{
                random_offset = mod(rand(vec2(TIME,TIME)), 1.0);
                local_glitch_size = random_offset * glitch_size;
              }
          
              if (local_glitch_size > 0.0)	{
                random.x = rand(vec2(floor(random_offset + xy.y / local_glitch_size) * local_glitch_size, TIME));
                random.y = rand(vec2(floor(random_offset + xy.x / local_glitch_size) * local_glitch_size, TIME));
              }
              else	{
                random.x = rand(vec2(xy.x, TIME));
                random.y = rand(vec2(xy.y, TIME));
              }
          
              //	if doing a horizontal glitch do a random shift
              if ((random.x < glitch_horizontal)&&(random.y < glitch_vertical))	{
                randomDelayShift = clamp(random.x + random.y, 0.0, 2.0);
              }
              else if (random.x < glitch_horizontal)	{
                randomDelayShift = clamp(random.x + random.y, 0.0, 2.0);
              }
              else if (random.y < glitch_vertical)	{
                randomDelayShift = clamp(random.x + random.y, 0.0, 2.0);
              }
          
              vec4 pixelBuffer = randomDelayShift * inputDelay * 9.0;
          
              if (randomize_zoom)	{
                if ((random.x < glitch_horizontal)&&(random.y < glitch_vertical))	{
                  float level = (random.x + random.y) / 3.0 + 0.90;
                  tex = (tex - vec2(0.5))*(1.0/level) + vec2(0.5);
                }
                else if (random.x < glitch_horizontal)	{
                  float level = (random.x) / 2.0 + 0.95;
                  tex = (tex - vec2(0.5))*(1.0/level) + vec2(0.5);
                }
                else if (random.y < glitch_vertical)	{
                  float level = (random.y) / 2.0 + 0.95;
                  tex = (tex - vec2(0.5))*(1.0/level) + vec2(0.5);
                }
              }
          
              if (randomize_position)	{
                if ((random.x < glitch_horizontal)&&(random.y < glitch_vertical))	{
                  tex.x = mod(tex.x + inputDelay.r * random.x, 1.0);
                  tex.y = mod(tex.y + inputDelay.r * random.y, 1.0);
                }
                else if (random.x < glitch_horizontal)	{
                  tex.y = mod(tex.y + inputDelay.r * random.x, 1.0);
                }
                else if (random.y < glitch_vertical)	{
                  tex.x = mod(tex.x + inputDelay.r * random.y, 1.0);
                }
                //	apply small random zoom too
              }
          
              if (pixelBuffer.r < 1.0)	{
                color.r = IMG_NORM_PIXEL(inputImage, tex).r;
              }
              else if (pixelBuffer.r < 2.0)	{
                color.r = IMG_NORM_PIXEL(buffer1, tex).r;
              }
              else if (pixelBuffer.r < 3.0)	{
                color.r = IMG_NORM_PIXEL(buffer2, tex).r;
              }
              else if (pixelBuffer.r < 4.0)	{
                color.r = IMG_NORM_PIXEL(buffer3, tex).r;
              }
              else if (pixelBuffer.r < 5.0)	{
                color.r = IMG_NORM_PIXEL(buffer4, tex).r;
              }
              else if (pixelBuffer.r < 6.0)	{
                color.r = IMG_NORM_PIXEL(buffer5, tex).r;
              }
              else if (pixelBuffer.r < 7.0)	{
                color.r = IMG_NORM_PIXEL(buffer6, tex).r;
              }
              else if (pixelBuffer.r < 8.0)	{
                color.r = IMG_NORM_PIXEL(buffer7, tex).r;
              }
              else	{
                color.r = IMG_NORM_PIXEL(buffer8, tex).r;
              }
          
              if (randomize_position)	{
                if ((random.x < glitch_horizontal)&&(random.y < glitch_vertical))	{
                  tex.x = mod(tex.x + random.x * inputDelay.g, 1.0);
                  tex.y = mod(tex.y + random.y * inputDelay.g, 1.0);
                }
                else if (random.x < glitch_horizontal)	{
                  tex.y = mod(tex.y + random.x * inputDelay.g, 1.0);
                }
                else if (random.y < glitch_vertical)	{
                  tex.x = mod(tex.x + random.y * inputDelay.g, 1.0);
                }
                //	apply small random zoom too
                //float level = inputDelay.g * random.x / 5.0 + 0.9;
                //tex = (tex - vec2(0.5))*(1.0/level) + vec2(0.5);
              }
          
              if (pixelBuffer.g < 1.0)	{
                color.g = IMG_NORM_PIXEL(inputImage, tex).g;
              }
              else if (pixelBuffer.g < 2.0)	{
                color.g = IMG_NORM_PIXEL(buffer1, tex).g;
              }
              else if (pixelBuffer.g < 3.0)	{
                color.g = IMG_NORM_PIXEL(buffer2, tex).g;
              }
              else if (pixelBuffer.g < 4.0)	{
                color.g = IMG_NORM_PIXEL(buffer3, tex).g;
              }
              else if (pixelBuffer.g < 5.0)	{
                color.g = IMG_NORM_PIXEL(buffer4, tex).g;
              }
              else if (pixelBuffer.g < 6.0)	{
                color.g = IMG_NORM_PIXEL(buffer5, tex).g;
              }
              else if (pixelBuffer.g < 7.0)	{
                color.g = IMG_NORM_PIXEL(buffer6, tex).g;
              }
              else if (pixelBuffer.g < 8.0)	{
                color.g = IMG_NORM_PIXEL(buffer7, tex).g;
              }
              else	{
                color.g = IMG_NORM_PIXEL(buffer8, tex).g;
              }
          
              if (randomize_position)	{
                if ((random.x < glitch_horizontal)&&(random.y < glitch_vertical))	{
                  tex.x = mod(tex.x + random.x * inputDelay.b, 1.0);
                  tex.y = mod(tex.y + random.y * inputDelay.b, 1.0);
                }
                else if (random.x < glitch_horizontal)	{
                  tex.y = mod(tex.y + random.x * inputDelay.b, 1.0);
                }
                else if (random.y < glitch_vertical)	{
                  tex.x = mod(tex.x + random.y * inputDelay.b, 1.0);
                }
                //	apply small random zoom too
                //float level = inputDelay.b * random.x / 5.0 + 0.9;
                //tex = (tex - vec2(0.5))*(1.0/level) + vec2(0.5);
              }
          
              if (pixelBuffer.b < 1.0)	{
                color.b = IMG_NORM_PIXEL(inputImage, tex).b;
              }
              else if (pixelBuffer.b < 2.0)	{
                color.b = IMG_NORM_PIXEL(buffer1, tex).b;
              }
              else if (pixelBuffer.b < 3.0)	{
                color.b = IMG_NORM_PIXEL(buffer2, tex).b;
              }
              else if (pixelBuffer.b < 4.0)	{
                color.b = IMG_NORM_PIXEL(buffer3, tex).b;
              }
              else if (pixelBuffer.b < 5.0)	{
                color.b = IMG_NORM_PIXEL(buffer4, tex).b;
              }
              else if (pixelBuffer.b < 6.0)	{
                color.b = IMG_NORM_PIXEL(buffer5, tex).b;
              }
              else if (pixelBuffer.b < 7.0)	{
                color.b = IMG_NORM_PIXEL(buffer6, tex).b;
              }
              else if (pixelBuffer.b < 8.0)	{
                color.b = IMG_NORM_PIXEL(buffer7, tex).b;
              }
              else	{
                color.b = IMG_NORM_PIXEL(buffer8, tex).b;
              }
          
              if (randomize_position)	{
                if ((random.x < glitch_horizontal)&&(random.y < glitch_vertical))	{
                  tex.x = mod(tex.x + random.x * inputDelay.a, 1.0);
                  tex.y = mod(tex.y + random.y * inputDelay.a, 1.0);
                }
                else if (random.x < glitch_horizontal)	{
                  tex.y = mod(tex.y + random.x * inputDelay.a, 1.0);
                }
                else if (random.y < glitch_vertical)	{
                  tex.x = mod(tex.x + random.y * inputDelay.a, 1.0);
                }
                //	apply small random zoom too
                //float level = inputDelay.a * random.x / 5.0 + 0.9;
                //tex = (tex - vec2(0.5))*(1.0/level) + vec2(0.5);
              }
          
              if (pixelBuffer.a < 1.0)	{
                color.a = IMG_NORM_PIXEL(inputImage, tex).a;
              }
              else if (pixelBuffer.a < 2.0)	{
                color.a = IMG_NORM_PIXEL(buffer1, tex).a;
              }
              else if (pixelBuffer.a < 3.0)	{
                color.a = IMG_NORM_PIXEL(buffer2, tex).a;
              }
              else if (pixelBuffer.a < 4.0)	{
                color.a = IMG_NORM_PIXEL(buffer3, tex).a;
              }
              else if (pixelBuffer.a < 5.0)	{
                color.a = IMG_NORM_PIXEL(buffer4, tex).a;
              }
              else if (pixelBuffer.a < 6.0)	{
                color.a = IMG_NORM_PIXEL(buffer5, tex).a;
              }
              else if (pixelBuffer.a < 7.0)	{
                color.a = IMG_NORM_PIXEL(buffer6, tex).a;
              }
              else if (pixelBuffer.a < 8.0)	{
                color.a = IMG_NORM_PIXEL(buffer7, tex).a;
              }
              else	{
                color.a = IMG_NORM_PIXEL(buffer8, tex).a;
              }
          
              gl_FragColor = color;
            }
          }`
    }

    edgesFS(): string {
        return `
        /*{
            "CREDIT": "by VIDVOX",
            "CATEGORIES": [
                "Stylize"
            ],
            "INPUTS": [
                {
                    "NAME": "inputImage",
                    "TYPE": "image"
                },
                {
                    "NAME": "intensity",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 50.0,
                    "DEFAULT": 50.0
                },
                {
                    "NAME": "threshold",
                    "TYPE": "float",
                    "MIN": 0.0,
                    "MAX": 1.0,
                    "DEFAULT": 0.5
                },
                {
                    "NAME": "sobel",
                    "TYPE": "bool",
                    "DEFAULT": 1.0
                },
                {
                    "NAME": "opaque",
                    "TYPE": "bool",
                    "DEFAULT": true
                }
            ]
        }*/
        
        
        varying vec2 left_coord;
        varying vec2 right_coord;
        varying vec2 above_coord;
        varying vec2 below_coord;
        
        varying vec2 lefta_coord;
        varying vec2 righta_coord;
        varying vec2 leftb_coord;
        varying vec2 rightb_coord;
        
        float gray(vec4 n)
        {
            return (n.r + n.g + n.b)/3.0;
        }
        
        void main()
        {
        
            vec4 color = IMG_THIS_PIXEL(inputImage);
            vec4 colorL = IMG_NORM_PIXEL(inputImage, left_coord);
            vec4 colorR = IMG_NORM_PIXEL(inputImage, right_coord);
            vec4 colorA = IMG_NORM_PIXEL(inputImage, above_coord);
            vec4 colorB = IMG_NORM_PIXEL(inputImage, below_coord);
        
            vec4 colorLA = IMG_NORM_PIXEL(inputImage, lefta_coord);
            vec4 colorRA = IMG_NORM_PIXEL(inputImage, righta_coord);
            vec4 colorLB = IMG_NORM_PIXEL(inputImage, leftb_coord);
            vec4 colorRB = IMG_NORM_PIXEL(inputImage, rightb_coord);
        
            float gx = (0.0);
            float gy = (0.0);
            if (sobel)	{
                gx = (-1.0 * gray(colorLA)) + (-2.0 * gray(colorL)) + (-1.0 * gray(colorLB)) + (1.0 * gray(colorRA)) + (2.0 * gray(colorR)) + (1.0 * gray(colorRB));
                gy = (1.0 * gray(colorLA)) + (2.0 * gray(colorA)) + (1.0 * gray(colorRA)) + (-1.0 * gray(colorRB)) + (-2.0 * gray(colorB)) + (-1.0 * gray(colorLB));
            }
            else	{
                gx = (-1.0 * gray(colorLA)) + (-1.0 * gray(colorL)) + (-1.0 * gray(colorLB)) + (1.0 * gray(colorRA)) + (1.0 * gray(colorR)) + (1.0 * gray(colorRB));
                gy = (1.0 * gray(colorLA)) + (1.0 * gray(colorA)) + (1.0 * gray(colorRA)) + (-1.0 * gray(colorRB)) + (-1.0 * gray(colorB)) + (-1.0 * gray(colorLB));
            }
        
            float bright = pow(gx*gx + gy*gy,0.5);
            vec4 final = color * bright;
        
            //	if the brightness is below the threshold draw black
            if (bright < threshold)	{
                if (opaque)
                    final = vec4(0.0, 0.0, 0.0, 1.0);
                else
                    final = vec4(0.0, 0.0, 0.0, 0.0);
            }
            else	{
                final = final * intensity;
                if (opaque)
                    final.a = 1.0;
            }
        
            gl_FragColor = final;
        }`
    }

    edgesVS(): string {
        return `
        varying vec2 left_coord;
varying vec2 right_coord;
varying vec2 above_coord;
varying vec2 below_coord;

varying vec2 lefta_coord;
varying vec2 righta_coord;
varying vec2 leftb_coord;
varying vec2 rightb_coord;


void main()
{
	isf_vertShaderInit();
	vec2 texc = vec2(isf_FragNormCoord[0],isf_FragNormCoord[1]);
	vec2 d = 1.0/RENDERSIZE;

	left_coord = clamp(vec2(texc.xy + vec2(-d.x , 0)),0.0,1.0);
	right_coord = clamp(vec2(texc.xy + vec2(d.x , 0)),0.0,1.0);
	above_coord = clamp(vec2(texc.xy + vec2(0,d.y)),0.0,1.0);
	below_coord = clamp(vec2(texc.xy + vec2(0,-d.y)),0.0,1.0);

	lefta_coord = clamp(vec2(texc.xy + vec2(-d.x , d.x)),0.0,1.0);
	righta_coord = clamp(vec2(texc.xy + vec2(d.x , d.x)),0.0,1.0);
	leftb_coord = clamp(vec2(texc.xy + vec2(-d.x , -d.x)),0.0,1.0);
	rightb_coord = clamp(vec2(texc.xy + vec2(d.x , -d.x)),0.0,1.0);
}
        `
    }


}