import { Component, h } from 'preact';
import { Knob } from '../../shared/ui/Knob'
import VideoGeneratorModule from '.';

import {debug} from "debug"

var logger = debug("plugin:chorder:view")

export interface VideoGeneratorProps {
  plugin: VideoGeneratorModule
}

type ChorderParams = {
}

export class VideoGeneratorView extends Component<VideoGeneratorProps, any> {
  statePoller: number

  constructor() {
    super();
    this.pollState = this.pollState.bind(this)
    this.state = {
    }
  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {
    this.pollState()
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {
    window.cancelAnimationFrame(this.statePoller)
  }

  async pollState() {
    this.state = await this.props.plugin.audioNode.getParameterValues(false)

    this.statePoller = window.requestAnimationFrame(this.pollState)
  }

  render() {
    h("div", {})

    return (
    <div class="video-generator-module">
        
    </div>)
  }

  css(): string {
    return `
      `
  }
  
}