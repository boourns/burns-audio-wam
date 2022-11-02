import { Component, h } from 'preact';
import style from './Modal.scss';

export type ModalProps = {}

export class Modal extends Component<ModalProps, any> {
  render() {
    return (
      <div class="GlowModalBackdrop">
        <div class="GlowModalContainer">
            {this.props.children}
        </div>
      </div>
    )
  }
}
