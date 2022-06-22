import { Component, h } from 'preact';
import { Label, LabelStyle } from '../controls/Label';
import style from './Box.scss';

export type BoxProps = {
  title: string
  actions: h.JSX.Element[] | h.JSX.Element
  topActions?: h.JSX.Element[]
}

export class Box extends Component<BoxProps, any> {
  render() {
    return (
        <div className={style.boxContainer}>
        <div class={style.boxHeader}>
          <Label style={LabelStyle.BoxHeader}>{this.props.title} {this.props.topActions ? this.props.topActions : ""}</Label>
        </div>
        <div class={style.boxContent}>
          {this.props.children}
        </div>
        <div class={style.boxFooter}>
          {this.props.actions}
        </div>
      </div>
    )
  }
}
