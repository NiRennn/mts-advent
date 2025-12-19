import { useLayoutEffect, useMemo, useRef, useState } from "react";
import "./Game.scss";
import Modal from "../Modal/Modal";
import Button from "../Button/Button";
import FaqOverlay from "../FaqOverlay/faqOverlay";
import { useApiStore } from "../../store/store";
import { useFaqStore } from "../../store/faqStore";
import { CELLS } from "./cells";
import { COMMON_CELL_CONTENT } from "./cells-content";

const BG_SRC = "/images/game-bg.png";
const API_ORIGIN = "https://mts-advent-25.despbots.ru";
const MAIN_EVENT = `${API_ORIGIN}/api/main_event/`;

const USER_ID = "783751626";

function withOrigin(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

function getMoscowNowParts(d = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

type CellModalKind = "content" | "notYet" | "pending" | "winners";

type CellModalState = {
  open: boolean;
  kind: CellModalKind;
  day: number | null;
};

export default function Game() {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const DEBUG_TODAY: number | null = 26;

  const userState = useApiStore((s) => s.api?.data?.user_data?.user_state);

  const [faqOpen, setFaqOpen] = useState(false);

  const [bgMode, setBgMode] = useState<"current" | "future">("current");

  const [cellModal, setCellModal] = useState<CellModalState>({
    open: false,
    kind: "content",
    day: null,
  });

  const fetchFaq = useFaqStore((s) => s.fetchFaq);

  const [enterLoading, setEnterLoading] = useState(false);

  useLayoutEffect(() => {
    if (!userState) return;

    setBgMode((prev) => {
      if (prev === "future") return "future";
      return userState.state === "current" ? "current" : "future";
    });

    const a = new Image();
    a.src = withOrigin(userState.current_img) ?? "";

    const b = new Image();
    b.src = withOrigin(userState.future_img) ?? "";
  }, [userState]);

  const bgSrc = useMemo(() => {
    if (!userState) return BG_SRC;

    const imgPath =
      bgMode === "future" ? userState.future_img : userState.current_img;

    return withOrigin(imgPath) ?? BG_SRC;
  }, [userState, bgMode]);

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

  const debug = true;

  useLayoutEffect(() => {
    if (!stageRef.current) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ w: width, h: height });
    });

    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const sendEnterDay = async (day_date: number) => {
    if (enterLoading) return;
    setEnterLoading(true);

    try {
      const res = await fetch(MAIN_EVENT, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          user_id: String(USER_ID),
          day_date: day_date,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail ?? data?.message ?? `HTTP ${res.status}`);
      }

      return data;
    } finally {
      setEnterLoading(false);
    }
  };

  const markUserStateFuture = () => {
  useApiStore.setState((s: any) => {
    const api = s.api;
    const us = api?.data?.user_data?.user_state;
    if (!us) return s;

    return {
      ...s,
      api: {
        ...api,
        data: {
          ...api.data,
          user_data: {
            ...api.data.user_data,
            user_state: {
              ...us,
              state: "future",
            },
          },
        },
      },
    };
  });
};


  const cover = useMemo(() => {
    const scale = Math.max(stageSize.w / imgSize.w, stageSize.h / imgSize.h);
    const drawW = imgSize.w * scale;
    const drawH = imgSize.h * scale;
    const offsetX = (stageSize.w - drawW) / 2;
    const offsetY = (stageSize.h - drawH) / 2;

    return { scale, drawW, drawH, offsetX, offsetY };
  }, [stageSize.w, stageSize.h, imgSize.w, imgSize.h]);

  const onStageClick = (e: React.MouseEvent) => {
    if (!debug || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const xOnImgPx = (cx - cover.offsetX) / cover.scale;
    const yOnImgPx = (cy - cover.offsetY) / cover.scale;

    const x = +(xOnImgPx / imgSize.w).toFixed(4);
    const y = +(yOnImgPx / imgSize.h).toFixed(4);

    console.log({ x, y, xPx: Math.round(xOnImgPx), yPx: Math.round(yOnImgPx) });
  };

  const onOpenCell = async (dayId: number) => {
    const now = getMoscowNowParts();
    // const today = now.day;
    // const today = DEBUG_TODAY ?? now.day;
    const today = DEBUG_TODAY;
    const todayToSend = DEBUG_TODAY - 7;

    if (dayId > today) {
      setCellModal({ open: true, kind: "notYet", day: dayId });
      return;
    }

    if (dayId === today) {
      if (userState?.state === "future") {
        setBgMode("future");
        setCellModal({ open: true, kind: "content", day: dayId });
        return;
      }

      try {
        await sendEnterDay(todayToSend);

        markUserStateFuture();

        setBgMode("future");

        setCellModal({ open: true, kind: "content", day: dayId });
      } catch (e) {
        console.error("enter-day error:", e);
        alert("Не удалось отправить запрос. Попробуй ещё раз.");
      }
      return;
    }

    const isYesterday = dayId === today - 1;
    const isBeforeNoon = now.hour < 14;

    if (isYesterday && isBeforeNoon) {
      setCellModal({ open: true, kind: "pending", day: dayId });
      return;
    }

    setCellModal({ open: true, kind: "winners", day: dayId });
  };

  const onCloseCellModal = () => {
    setCellModal((prev) => ({ ...prev, open: false, day: null }));
  };

  const onOpenFaq = () => {
    setFaqOpen(true);

    const userId = 783751626;
    if (userId) fetchFaq(userId);
  };

  const modalConfig = useMemo(() => {
    const day = cellModal.day;

    if (!day) {
      return {
        title: "Ячейка",
        body: <div />,
        ctaText: "Ок",
        onCta: onCloseCellModal,
      };
    }

    if (cellModal.kind === "content") {
      return {
        ...COMMON_CELL_CONTENT,
        onCta: () => {
          onCloseCellModal();
        },
      };
    }

    if (cellModal.kind === "notYet") {
      return {
        title: "Этот день ещё не настал :)",
        body: (
          <div style={{ whiteSpace: "pre-line" }}>
            Но впереди ещё много сюрпризов — заходи ежедневно до 29 декабря.
          </div>
        ),
        ctaText: "Хорошо",
        onCta: onCloseCellModal,
      };
    }

    if (cellModal.kind === "pending") {
      return {
        title: "Подводим итоги",
        body: (
          <div style={{ whiteSpace: "pre-line" }}>
            Результаты за {day} декабря будут доступны после 14:00.
          </div>
        ),
        ctaText: "Ок",
        onCta: onCloseCellModal,
      };
    }

    return {
      title: `Победители розыгрыша от ${day}`,
      body: (
        <div style={{ whiteSpace: "pre-line" }}>
          Angel_Shapovalova
          <br />
          VldmrPckt
          <br />
          nadejdarybalova <br />
          randomasan <br /> melnichenko
          <p>
            Нашёл себя в&nbsp;списке? Отлично&nbsp;— жми&nbsp;кнопку ниже
            и&nbsp;напиши в&nbsp;сообщество МТС&nbsp;в&nbsp;ВК,
            чтобы&nbsp;получить приз.
          </p>
        </div>
      ),
      ctaText: "Я победил!",
      onCta: onCloseCellModal,
    };
  }, [cellModal.kind, cellModal.day]);

  return (
    <div className="Game">
      <div className="Game__infoBlock">
        <button type="button" className="Game__infoBtn" onClick={onOpenFaq}>
          <img src="/icons/info.svg" alt="" />
        </button>
      </div>

      <div className="Game__stage" ref={stageRef} onClick={onStageClick}>
        <img
          className="Game__bg"
          src={bgSrc}
          alt=""
          key={bgSrc}
          onLoad={(e) =>
            setImgSize({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
        />

        <div className="Game__overlay">
          <svg
            className="Game__svg"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={{
              left: cover.offsetX,
              top: cover.offsetY,
              width: cover.drawW,
              height: cover.drawH,
              position: "absolute",
              pointerEvents: "none",
            }}
          >
            {CELLS.map((c) => (
              <polygon
                key={c.id}
                className="Game__poly"
                points={c.points.map(([x, y]) => `${x},${y}`).join(" ")}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCell(c.id);
                }}
                style={{
                  pointerEvents: "all",
                  fill: "transparent",
                  cursor: "pointer",
                }}
                aria-label={`Открыть ${c.id}`}
              />
            ))}
          </svg>
        </div>
      </div>

      <FaqOverlay open={faqOpen} onClose={() => setFaqOpen(false)} />

      <Modal
        open={cellModal.open}
        onClose={onCloseCellModal}
        placement="bottom"
        title={modalConfig.title}
        footer={
          <Button variant="primary" onClick={modalConfig.onCta}>
            {modalConfig.ctaText}
          </Button>
        }
      >
        {modalConfig.body}
      </Modal>
    </div>
  );
}
