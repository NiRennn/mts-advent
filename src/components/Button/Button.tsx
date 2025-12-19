import React from 'react'
import './Button.scss'

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={cn(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        loading && 'btn--loading',
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="btn__content">{children}</span>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
    </button>
  )
}
