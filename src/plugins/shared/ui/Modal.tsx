import { Component, h } from 'preact';
import style from './Modal.scss';

export type ModalProps = {}

export class Modal extends Component<ModalProps, any> {
  render() {
    return (
      <div class={style.backdrop}>
        <div class={style.modalContainer}>
            {this.props.children}
        </div>
      </div>
    )
  }
}
