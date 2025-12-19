import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Modal.scss";

type Placement = "bottom" | "center";

type ModalProps = {
  open: boolean;
  onClose?: () => void;

  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;

  closeOnOverlayClick?: boolean;
  lockScroll?: boolean;

  placement?: Placement;
  showHandle?: boolean;
};

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

const CLOSE_MS = 260;

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  closeOnOverlayClick = true,
  lockScroll = true,
  placement = "bottom",
  showHandle = true,
}: ModalProps) {
  const titleId = useId();
  const overlayMouseDownOnOverlay = useRef(false);

  const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";
  const portalTarget = useMemo<HTMLElement | null>(() => (canUseDOM ? document.body : null), [canUseDOM]);

  const [mounted, setMounted] = useState(open);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      setMounted(true);
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
    }, CLOSE_MS);

    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !canUseDOM || !lockScroll) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll, canUseDOM]);

  if (!mounted || !portalTarget) return null;

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    overlayMouseDownOnOverlay.current = e.target === e.currentTarget;
  };

  const handleOverlayMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const isOverlay = e.target === e.currentTarget;

    if (closeOnOverlayClick && overlayMouseDownOnOverlay.current && isOverlay) {
      onClose?.();
    }

    overlayMouseDownOnOverlay.current = false;
  };

  const dialog = (
    <div
      className={cn("modal", `modal--${placement}`, open ? "is-open" : "is-closing")}
      role="presentation"
      aria-hidden={!open}
    >
      <div className="modal__overlay" onMouseDown={handleOverlayMouseDown} onMouseUp={handleOverlayMouseUp}>
        <div
          className={cn("modal__panel", className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          {placement === "bottom" && showHandle && <div className="modal__handle" aria-hidden="true" />}

          {title && (
            <div className="modal__header">
              <h2 className="modal__title" id={titleId}>
                {title}
              </h2>
            </div>
          )}

          <div className="modal__content">{children}</div>
          {footer && <div className="modal__footer">{footer}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, portalTarget);
}
