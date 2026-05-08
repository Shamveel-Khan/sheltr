import { Modal } from './Modal';

export function Confirm({ open, msg, onConfirm, onCancel }) {
  if (!open) return null;
  
  return (
    <Modal 
      open={open} 
      title="Confirm Action" 
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </>
      }
    >
      <p>{msg}</p>
    </Modal>
  );
}