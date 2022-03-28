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

}