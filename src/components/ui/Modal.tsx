import type { ReactNode, MouseEvent } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl leading-none cursor-pointer"
            >
              x
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
