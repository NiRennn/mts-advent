import { useLayoutEffect, useMemo, useRef, useState } from "react";
import "./Game.scss";
import Modal from "../Modal/Modal";
import Button from "../Button/Button";
import FaqOverlay from "../FaqOverlay/faqOverlay";
import { useApiStore } from "../../store/store";
import { useFaqStore } from "../../store/faqStore";
import { CELLS } from "./cells";
import { COMMON_CELL_CONTENT } from "./cells-content";
import { useTgStore } from "../../store/tgStore";

const BG_SRC = "/images/game-bg.png";
const API_ORIGIN = "https://mts-advent-25.despbots.ru";
const MAIN_EVENT = `${API_ORIGIN}/api/main_event/`;

// const USER_ID = "783751626";

function withOrigin(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

type CellModalKind = "content" | "notYet" | "pending" | "winners" | "dead";

type CellModalState = {
  open: boolean;
  kind: CellModalKind;
  day: number | null;
  winners?: string[];
};

type MainEventData = {
  state_update?: boolean;
  new_state?: string;
  day_data?: {
    day_status?: string;
    dead_day?: boolean;
    day_winners?: Array<{ name?: string }>;
  };
};

type MainEventResponse = {
  status: boolean;
  data?: MainEventData;
  message?: string;
  detail?: string;
};

const DAY_SHIFT = -7;

export default function Game() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tgUserId = useTgStore((s) => s.userDataTg?.id);

  const userState = useApiStore((s) => s.api?.data?.user_data?.user_state);

  const [faqOpen, setFaqOpen] = useState(false);

  const [bgMode, setBgMode] = useState<"current" | "future">("current");

  const [cellModal, setCellModal] = useState<CellModalState>({
    open: false,
    kind: "content",
    day: null,
    winners: [],
  });

  const dayCacheRef = useRef(new Map<number, any>());
  const dayInflightRef = useRef(new Map<number, Promise<any>>());

  const fetchFaq = useFaqStore((s) => s.fetchFaq);

  const [, setEnterLoading] = useState(false);

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

  type NormalizedDayStatus = "past" | "current" | "future" | "unknown";

  function normalizeDayStatus(v: unknown): NormalizedDayStatus {
    const s = String(v ?? "")
      .toLowerCase()
      .trim();

    if (s === "past") return "past";
    if (s === "current") return "current";

    if (s === "future" || s === "not_yet" || s === "notyet") return "future";

    return "unknown";
  }

  const sendEnterDay = async (dayId: number): Promise<MainEventData> => {
    const cached = dayCacheRef.current.get(dayId);
    if (cached) return cached;

    const inflight = dayInflightRef.current.get(dayId);
    if (inflight) return await inflight;

    const p = (async () => {
      setEnterLoading(true);
      try {
        const res = await fetch(MAIN_EVENT, {
          method: "POST",
          mode: "cors",
          cache: "no-cache",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          redirect: "follow",
          referrerPolicy: "no-referrer",
          body: JSON.stringify({
            user_id: String(tgUserId),
            day_date: dayId + DAY_SHIFT,
          }),
        });

        const json = (await res
          .json()
          .catch(() => null)) as MainEventResponse | null;

        if (!json) {
          throw new Error(`Пустой ответ сервера (HTTP ${res.status})`);
        }

        const data = json.data;
        const dayStatus = data?.day_data?.day_status;

        if ((!res.ok || json.status !== true) && !dayStatus) {
          throw new Error(json.detail ?? json.message ?? `HTTP ${res.status}`);
        }

        if (!data) {
          throw new Error("Ответ без поля data");
        }

        dayCacheRef.current.set(dayId, data);
        return data;
      } finally {
        setEnterLoading(false);
        dayInflightRef.current.delete(dayId);
      }
    })();

    dayInflightRef.current.set(dayId, p);
    return await p;
  };

  const updateUserState = (newState: string) => {
    useApiStore.setState((s: any) => {
      const api = s.api;
      const us = api?.data?.user_data?.user_state;
      if (!api || !us) return s;

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
                state: newState,
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
    try {
      const data = await sendEnterDay(dayId);
      const dayData = data?.day_data;

      // const dayData = data?.day_data;

      const rawStatus = dayData?.day_status;
      const dayStatus = normalizeDayStatus(rawStatus);

      const winnersRaw = dayData?.day_winners;

      const winnersArr: any[] = Array.isArray(winnersRaw)
        ? winnersRaw
        : winnersRaw
        ? [winnersRaw]
        : [];

      const winners: string[] = winnersArr
        .map((w: any) => String(w?.name ?? "").trim())
        .filter(Boolean);

      if (data?.state_update && typeof data?.new_state === "string") {
        updateUserState(data.new_state);
        if (data.new_state === "future") setBgMode("future");
        if (data.new_state === "current") setBgMode("current");
      }

      if (dayStatus === "future") {
        setCellModal({ open: true, kind: "notYet", day: dayId, winners: [] });
        return;
      }

      if (dayStatus === "current") {
        if (dayData?.dead_day === true) {
          setCellModal({ open: true, kind: "dead", day: dayId, winners: [] });
          return;
        }

        setCellModal({ open: true, kind: "content", day: dayId, winners: [] });
        return;
      }

      if (dayStatus === "past") {
        if (dayData?.dead_day === true) {
          setCellModal({ open: true, kind: "dead", day: dayId, winners: [] });
          return;
        }
        if (winners.length > 0) {
          setCellModal({ open: true, kind: "winners", day: dayId, winners });
        } else {
          setCellModal({
            open: true,
            kind: "pending",
            day: dayId,
            winners: [],
          });
        }
        return;
      }

      console.warn("Unknown day_status:", rawStatus);
      setCellModal({ open: true, kind: "pending", day: dayId, winners: [] });
    } catch (e) {
      console.error("enter-day error:", e);
      alert("Не удалось отправить запрос. Попробуй ещё раз.");
    }
  };

  const onCloseCellModal = () => {
    setCellModal((prev) => ({ ...prev, open: false, day: null, winners: [] }));
  };

  const onOpenFaq = () => {
    setFaqOpen(true);

    // const userId = 783751626;
    if (tgUserId) fetchFaq(tgUserId);
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
        title: "Подводим итоги...",
        body: (
          <div style={{ whiteSpace: "pre-line" }}>
            Итоги появятся здесь до 14:00 по МСК, следите за новостями
          </div>
        ),
        ctaText: "Ок",
        onCta: onCloseCellModal,
      };
    }
    if (cellModal.kind === "dead") {
      return {
        title: "Адвент завершился,\nа праздник только начинается.",
        body: (
          <div style={{ whiteSpace: "pre-line" }}>
            Спасибо, что был(-а) с нами,
            {"\n"}и с наступающим 2026 годом!
          </div>
        ),
        ctaText: "Ура!",
        onCta: onCloseCellModal,
      };
    }

    if (cellModal.kind === "winners") {
      return {
        title: `Победители розыгрыша от ${day}.12.2025`,
        body: (
          <div>
            <ul className="winnersList">
              {(cellModal.winners ?? []).map((name, i) => (
                <li key={`${name}-${i}`} className="winnersList__item">
                  {name}
                </li>
              ))}
            </ul>

            <p className="winnersHint">
              Нашёл себя в&nbsp;списке? Отлично&nbsp;— жми&nbsp;кнопку ниже
              и&nbsp;напиши в&nbsp;сообщество МТС&nbsp;в&nbsp;ВК,
              чтобы&nbsp;получить приз.
            </p>
          </div>
        ),
        ctaText: "Я победил!",
        onCta: onCloseCellModal,
      };
    }

    return {
      title: `Победители розыгрыша от ${day}.12.2025`,
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
  }, [cellModal.kind, cellModal.day, cellModal.winners]);

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
