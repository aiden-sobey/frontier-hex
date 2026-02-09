import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-amber-600 hover:bg-amber-500 text-white border-amber-700',
  secondary:
    'bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600',
  danger:
    'bg-red-700 hover:bg-red-600 text-white border-red-800',
  ghost:
    'bg-transparent hover:bg-gray-700 text-gray-300 border-transparent',
}

export function Button({
  variant = 'primary',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        px-3 py-1.5 rounded text-sm font-medium border
        transition-colors duration-150 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
