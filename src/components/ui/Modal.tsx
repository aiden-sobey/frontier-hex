import type { ReactNode, MouseEvent } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
        {title && (
          <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="cursor-pointer text-xl leading-none text-gray-400 hover:text-white"
            >
              x
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
