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
        this.renderer.loadSource(fragmentSrc, vertexSrc);
        if (!!this.renderer.error) {
          throw this.renderer.error
        }
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
          case "color":
            ['r', 'g', 'b', 'a'].forEach((v, i) => {
              params.push({
                id: `${input.NAME}_${v}`,
                config: {
                  type: "float",
                  defaultValue: (input.DEFAULT as number[])[i],
                  minValue: 0,
                  maxValue: 1,
                  label: `${input.NAME}_${v}`
                }
              })
            })
            break
          case "point2D":
              ['x', 'y'].forEach((v, i) => {
                params.push({
                  id: `${input.NAME}_${v}`,
                  config: {
                    type: "float",
                    defaultValue: (input.DEFAULT as number[])[i],
                    minValue: 0,
                    maxValue: 1,
                    label: `${input.NAME}_${v}`
                  }
                })
              })
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
        
        if (this.renderer.uniforms["inputImage"]) {
          this.renderer.setValue("inputImage", inputs[0], true)
          this.renderer.setValue(`_inputImage_imgSize`, [this.options.width, this.options.height]);
          this.renderer.setValue(`_inputImage_imgRect`, [0, 0, 1, 1]);
          this.renderer.setValue(`_inputImage_flip`, false);
        }
        
        let shaderInputs = this.renderer.model.inputs.filter((u: ISFUniform) => u.TYPE != "image")
        for (let i of shaderInputs) {
          if (i.TYPE == "color") {
            if (params[`${i.NAME}_r`] && params[`${i.NAME}_g`] && params[`${i.NAME}_b`] && params[`${i.NAME}_a`]) {
              const value = [params[`${i.NAME}_r`].value, params[`${i.NAME}_g`].value, params[`${i.NAME}_b`].value, params[`${i.NAME}_a`].value]
              this.renderer.setValue(i.NAME, value)
            }
          } else if (i.TYPE == "point2D") {
            if (params[`${i.NAME}_x`] && params[`${i.NAME}_y`]) {
              this.renderer.setValue(i.NAME, [params[`${i.NAME}_x`].value, params[`${i.NAME}_y`].value])
            }
          } else {
            if (params[i.NAME]) {
              this.renderer.setValue(i.NAME, params[i.NAME].value)
            }
          }
        }
        
        let output = this.renderer.draw(this.options.width, this.options.height)
        return [output]
    }

}