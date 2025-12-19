import  { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./FaqOverlay.scss";
import { useFaqStore } from "../../store/faqStore";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export default function FaqOverlay({
  open,
  onClose,
  title = "Частые вопросы",
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const faq = useFaqStore((s) => s.faq);
  const isLoading = useFaqStore((s) => s.isLoading);
  const error = useFaqStore((s) => s.error);

  const canUseDOM =
    typeof window !== "undefined" && typeof document !== "undefined";

  const tg = useMemo(
    () => (canUseDOM ? (window as any)?.Telegram?.WebApp : null),
    [canUseDOM]
  );

  const portalTarget = useMemo(
    () => (canUseDOM ? document.body : null),
    [canUseDOM]
  );



  useEffect(() => {
    if (!tg?.BackButton) return;

    const handler = () => onClose();

    if (open) {
      tg.BackButton.show();
      tg.BackButton.onClick(handler);
    } else {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, [open, tg, onClose]);

  useEffect(() => {
    if (!open || !canUseDOM) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, canUseDOM]);

  useEffect(() => {
    if (!open || !canUseDOM) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, canUseDOM]);

  useEffect(() => {
    if (!open) setOpenId(null);
  }, [open]);

  const items = useMemo(() => {
    if (isLoading) {
      return [
        {
          id: "loading",
          question: "Загрузка…",
          answer: <div>Получаем вопросы…</div>,
        },
      ];
    }

    if (error) {
      return [
        {
          id: "error",
          question: "Не удалось загрузить FAQ",
          answer: <div style={{ whiteSpace: "pre-line" }}>{error}</div>,
        },
      ];
    }

    const arr = Array.isArray(faq?.data) ? faq.data : [];
    if (!arr.length) {
      return [
        {
          id: "empty",
          question: "Пока нет вопросов",
          answer: <div>FAQ пуст.</div>,
        },
      ];
    }

    return arr.map((it, idx) => ({
      id: `q${idx + 1}`,
      question: it.question_title,
      answer: <div style={{ whiteSpace: "pre-line" }}>{it.answer_text}</div>,
    }));
  }, [faq, isLoading, error]);

  if (!open || !portalTarget) return null;

  const ui = (
    <div className="faqOverlay" role="dialog" aria-modal="true">
      <div className="faqOverlay__backdrop" onClick={onClose} />

      <div className="faqOverlay__panel" onClick={(e) => e.stopPropagation()}>
        <h1 className="faqOverlay__title">{title}</h1>

        <div className="faqOverlay__list">
          {items.map((it) => {
            const isOpen = openId === it.id;

            return (
              <div key={it.id} className={cn("faqItem", isOpen && "is-open")}>
                <button
                  type="button"
                  className="faqItem__header"
                  onClick={() => setOpenId(isOpen ? null : it.id)}
                  aria-expanded={isOpen}
                  disabled={
                    it.id === "loading" ||
                    it.id === "error" ||
                    it.id === "empty"
                  }
                >
                  <span
                    className={cn("faqItem__icon", isOpen && "is-open")}
                    aria-hidden="true"
                  />
                  <span className="faqItem__question">{it.question}</span>
                </button>

                {isOpen && <div className="faqItem__answer">{it.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(ui, portalTarget);
}
