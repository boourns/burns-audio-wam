import { Component, h } from 'preact';

export type ModalProps = {
  title: string
  actions: h.JSX.Element[]
  topActions?: h.JSX.Element[]
}

export class Modal extends Component<ModalProps, any> {
  render() {
    h("div", {})

    return (
      <div>
      <div class="backdrop">
        <div class="modal-container box-container">
          <div class="box-header">{this.props.title} {this.props.topActions ? this.props.topActions : ""}</div>
          <div class="box-content">
            {this.props.children}
          </div>
          <div class="box-footer">
            {this.props.actions}
          </div>
        </div>
      </div>
      <style>
        {this.css()}
      </style>
      </div>
    )
  }

  css() {
    return `
    .backdrop {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: rgba(0,0,0,0.3);
      padding: 50px;
  }
  
  .box-header {
      @apply bg-gray-300;
      padding: 4px;
      font-weight: 500;
  }
  
  .modal-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
  
      margin: 0 auto;
  }
  
  .box-container {
      @apply bg-gray-200;
      border-radius: 4px;
      border: 1px solid rgba(0,0,0,0.3);
  
      max-width: 800px;
      min-width: 300px;
  
      display: flex;
      flex-direction: column;   
  }
  
  .box-content {
      padding: 10px;
  }
  
  .box-footer {
      padding-left: 10px;
      padding-right: 10px;
      bottom: 0px;
  }
    `
  }
}
