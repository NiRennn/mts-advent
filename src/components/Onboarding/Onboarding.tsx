import "./Onboarding.scss";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import Modal from "../Modal/Modal";
import Button from "../Button/Button";
import { useNavigate } from "react-router-dom";
import appRoutes from "../../routes/routes";
import { useApiStore } from "../../store/store";
import { useTgStore } from "../../store/tgStore";
import { gsap } from "gsap";
import ServerConnect from "../../utils/ServerConnect";

type ModalType = "noRed" | "yesRed" | null;
type Step = "list" | "question";

export default function Onboarding() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const introPlayed = useRef(false);

  const navigate = useNavigate();

  // VITE_API_ORIGIN=https://mts-advent-25.despbots.ru
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "https://mts-advent-25.despbots.ru";
  const JOIN_URL = `${API_ORIGIN}/api/enter-red/`;

  const [open, setOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [step, setStep] = useState<Step>("list");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [, setUserInfo] = useState<any>(null);

  const setApi = useApiStore((s) => s.setApi);

  const hydrateFromTelegram = useTgStore((s) => s.hydrateFromTelegram);
  // const tg = useTgStore((s) => s.tg);
  const userDataTg = useTgStore((s) => s.userDataTg);

  // const getEffectiveUserId = (): number | null => {
  //   try {
  //     const idFromUnsafe =
  //       tg?.initDataUnsafe?.user?.id != null
  //         ? Number(tg.initDataUnsafe.user.id)
  //         : NaN;
  //
  //     if (Number.isFinite(idFromUnsafe)) return idFromUnsafe;
  //
  //     const p = new URLSearchParams(window.location.search).get("user_id");
  //     const idFromQuery = p ? Number(p) : NaN;
  //     if (Number.isFinite(idFromQuery)) return idFromQuery;
  //
  //     return null;
  //   } catch {
  //     return null;
  //   }
  // };

  // const effectiveUserId = useMemo(() => {
  //   const idFromTg = Number(tg?.initDataUnsafe?.user?.id);
  //   if (Number.isFinite(idFromTg) && idFromTg > 0) return idFromTg;
  
  //   return 783751626;
  // }, [tg]);

  const [joinLoading, setJoinLoading] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
    setModalType(null);
  }, []);

  const openModal = useCallback((type: Exclude<ModalType, null>) => {
    setModalType(type);
    setOpen(true);
  }, []);

  useEffect(() => {
    hydrateFromTelegram();
  }, [hydrateFromTelegram]);

  useEffect(() => {
    // const effectiveUserId = 783751626;
    // const effectiveFirstName = "Кост";
    // const effectiveLastName = "";
    // const effectiveUsername = "Deadly_Harlequine";
    // const effectiveInitData =
    //   "user=%7B%22id%22%3A783751626%2C%22first_name%22%3A%22%D0%9A%D0%BE%D1%81%D1%82%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22Deadly_Harlequine%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fl0kw4w0I95ZbMH8JAdPx3NfQwh1NpMo80TLCuNUWD38.svg%22%7D&chat_instance=4806822834290104952&chat_type=private&auth_date=1766064066&signature=...&hash=...";
    //
    // const hardcodedUser = {
    //   id: effectiveUserId,
    //   first_name: effectiveFirstName,
    //   last_name: effectiveLastName,
    //   username: effectiveUsername,

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    let shouldGoGame = false;

    const fetchUserData = async () => {
      if (!userDataTg?.id) {
        console.error("Telegram user is missing (tg.initDataUnsafe.user).");
        shouldGoGame = false;
        return;
      }

      // const tg = window.Telegram.WebApp;
      // const userDataTg = tg.initDataUnsafe.user;
      //
      // ServerConnect.getUser({
      //   url: 'users',
      //   user_firstname: userDataTg.first_name,
      //   user_id: userDataTg.id,
      //   user_lastname: userDataTg.last_name ? userDataTg.last_name : '',
      //   user_username: userDataTg.username ? userDataTg.username : '',
      //   utm_mark: typeof tg.initDataUnsafe.start_param === 'undefined' ? '' : tg.initDataUnsafe.start_param,
      // })

      const response = await ServerConnect.getUser({
        url: "users",
        user_firstname: userDataTg.first_name,
        user_id: userDataTg.id,
        user_lastname: userDataTg.last_name ? userDataTg.last_name : "",
        user_username: userDataTg.username ? userDataTg.username : "",
        utm_mark: userDataTg.utm_mark,
      });

      if (cancelled) return;

      const raw: any = response;
      const payload =
        raw && typeof raw === "object" && raw.result === "ok" && raw.data
          ? raw.data
          : raw;

      setApi(payload);
      setUserInfo(payload);

      const mtsRedEnter =
        payload?.data?.user_data?.mts_red_enter ??
        payload?.user_data?.mts_red_enter ??
        raw?.data?.user_data?.mts_red_enter ??
        false;

      shouldGoGame = Boolean(mtsRedEnter);
    };

    (async () => {
      try {
        await Promise.all([sleep(3000), fetchUserData()]);
      } catch (e) {
        console.error("Error fetching user data:", e);
      } finally {
        document.body.style.overflow = prevOverflow;

        if (!cancelled) {
          if (shouldGoGame) {
            navigate(appRoutes.GAME, { replace: true });
          } else {
            setPageLoading(false);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      document.body.style.overflow = prevOverflow;
    };
  }, [navigate, setApi, userDataTg]);

  // useEffect(() => {
  //   const hardcodedUser = {
  //     id: 783751626,
  //     first_name: "Кост",
  //     last_name: "",
  //     username: "Deadly_Harlequine",
  //   };
  //
  //   const prevOverflow = document.body.style.overflow;
  //   document.body.style.overflow = "hidden";
  //
  //   const controller = new AbortController();
  //   let cancelled = false;
  //
  //   const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  //   const user = tg?.initDataUnsafe?.user ?? hardcodedUser;
  //
  //   const fetchUserData = async () => {
  //     if (!user?.id) return;
  //
  //     const url = new URL("https://mts-advent-25.despbots.ru/api/users/");
  //     url.searchParams.set("user_id", String(user.id));
  //     url.searchParams.set("user_firstname", hardcodedUser.first_name);
  //
  //     const response = await fetch(url.toString(), {
  //       method: "GET",
  //       headers: { "Content-Type": "application/json" },
  //       signal: controller.signal,
  //     });
  //
  //     const raw = await response.json().catch(() => null);
  //     if (!response.ok) throw new Error(`GET ${url} → HTTP ${response.status}`);
  //
  //     const payload =
  //       raw && typeof raw === "object" && raw.result === "ok" && raw.data
  //         ? raw.data
  //         : raw;
  //
  //     setApi(payload);
  //     if (!cancelled) setUserInfo(payload);
  //   };
  //
  //   (async () => {
  //     try {
  //       await Promise.all([sleep(3000), fetchUserData()]);
  //     } catch (e) {
  //       console.error("Error fetching user data:", e);
  //     } finally {
  //       document.body.style.overflow = prevOverflow;
  //       if (!cancelled) setPageLoading(false);
  //     }
  //   })();
  //
  //   return () => {
  //     cancelled = true;
  //     controller.abort();
  //     document.body.style.overflow = prevOverflow;
  //   };
  // }, [tg, setApi]);

  const sendJoinRequest = useCallback(async () => {
    if (!userDataTg?.id || joinLoading) return;

    setJoinLoading(true);
    try {
      const res = await fetch(JOIN_URL, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          // Authorization: tg?.initData ?? "",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          user_id: userDataTg.id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail ?? data?.message ?? `HTTP ${res.status}`);
      }

      closeModal();
      navigate(appRoutes.GAME);
    } catch (e) {
      console.error("POST join error:", e);
      alert("Не удалось отправить запрос. Попробуй ещё раз.");
    } finally {
      setJoinLoading(false);
    }
  }, [JOIN_URL, closeModal, joinLoading, navigate, userDataTg?.id]);

  useLayoutEffect(() => {
    if (pageLoading) return;
    const scope = rootRef.current;
    if (!scope) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    const q = gsap.utils.selector(scope);

    const top = q(".Onboarding__content-topBlock > *");

    const listTargets = q(".botBlock-wrap, .continue, .Onboarding__content-botBlock button");
    const questionTargets = q(".botBlock-whitebox, .botBlock-text, .botBlock-btnBlock");
    const targets = step === "list" ? listTargets : questionTargets;

    const ctx = gsap.context(() => {
      if (!introPlayed.current) {
        gsap.set(top, { autoAlpha: 0, y: 12 });
        gsap.to(top, {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.06,
        });
        introPlayed.current = true;
      }

      gsap.set(targets, { autoAlpha: 0, y: 16 });
      gsap.to(targets, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.08,
        delay: 0.05,
        clearProps: "transform",
      });
    }, scope);

    return () => ctx.revert();
  }, [pageLoading, step]);

  const modalConfig = useMemo(() => {
    switch (modalType) {
      case "noRed":
        return {
          title: "Становись абонентом тарифа МТС RED, чтобы принять участие ",
          body: (
            <p>
              В тариф входит безлимитный интернет, 1000 минут и смс, а также технологии Voicetech от МТС. <br />
              Подключай тариф МТС RED, возвращайся в адвент и получи шанс выиграть крутые призы!
            </p>
          ),
          footer: (
            <Button
              variant="primary"
              onClick={() => {
                closeModal();
              }}
            >
              Хорошо
            </Button>
          ),
        };

      case "yesRed":
        return {
          title: "Это адвент-календарь!",
          body: (
            <ul className="modal-ul">
              <li className="modal-li">
                Нажимай на <span className="modal-em">сегодняшнюю дату —</span>{" "}
                и участвуй в розыгрыше дня.
              </li>
              <li className="modal-li">
                {" "}
                Хочешь посмотреть результаты? Открывай{" "}
                <span className="modal-em">прошедшие даты.</span>{" "}
              </li>
              <li className="modal-li">
                Если что-то непонятно, нажми на (?) в правом верхнем углу.
              </li>
              <li className="modal-li">
                Розыгрыши идут{" "}
                <span className="modal-em">с 24 по 29 декабря —</span> каждый
                день новый шанс выиграть
              </li>
              <li className="modal-li">
                <span className="modal-em">Среди призов</span> самая топовая
                техника – сматрфоны, наушники, ноутбуки, игровые консоли,
                смарт-часы и планшеты!
              </li>
            </ul>
          ),
          footer: (
            <Button variant="primary" onClick={sendJoinRequest}>
              {joinLoading ? "Отправляем..." : "Мне повезёт!"}
            </Button>
          ),
        };

      default:
        return { title: "", body: null, footer: null };
    }
  }, [closeModal, joinLoading, modalType, sendJoinRequest]);

  if (pageLoading) {
    return (
      <div className="Onboarding" ref={rootRef}>
        <div className="Onboarding__loadingOverlay" role="status" aria-label="Загрузка">
          <img src="/icons/loader.svg" alt="" className="Onboarding__spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="Onboarding" ref={rootRef}>
      <div className="Onboarding__content">
        <div className="Onboarding__content-topBlock">
          <p className="topBlock-text left">Розыгрыш</p>
          <p className="topBlock-text right">«Адвент-календарь»</p>
          <p className="topBlock-subtext">для абонентов тарифа МТС RED</p>
        </div>

        {step === "list" ? (
          <div className="Onboarding__content-botBlock" key={step}>
            <div className="botBlock-wrap">
              <div className="botBlock-list">
                <ul>
                  <li>Открывай новую дату каждый день и участвуй в розыгрыше.</li>
                  <li>В окошках прошедших дней — результаты и победители </li>
                  <li>Детали о розыгрыше — в знаке вопроса в правом верхнем углу.</li>
                </ul>
              </div>
            </div>

            <p className="continue">
              Продолжая, ты&nbsp;принимаешь&nbsp;
              <a href="#" className="continue-link">
                правила акции и пользовательское соглашение
              </a>
            </p>

            <Button
              variant="primary"
              onClick={() => {
                if (!rootRef.current) return setStep("question");

                const q = gsap.utils.selector(rootRef.current);
                gsap.to(q(".Onboarding__content-botBlock"), {
                  autoAlpha: 0,
                  y: -8,
                  duration: 0.2,
                  ease: "power2.out",
                  onComplete: () => setStep("question"),
                  clearProps: "transform",
                });
              }}
            >
              Вперёд!
            </Button>
          </div>
        ) : (
          <div className="Onboarding__content-botBlock" key={step}>
            <div className="botBlock-whitebox">
              <p className="botBlock-wb-text">Розыгрыш проводится среди абонентов тарифа МТС RED</p>
              <Button variant="primary">Подключить тариф</Button>
            </div>

            <p className="botBlock-text">
              У тебя уже подключен тариф
              <br /> МТС RED?
            </p>

            <div className="botBlock-btnBlock">
              <Button variant="secondary" onClick={() => openModal("noRed")}>
                Пока нет
              </Button>

              <Button
                variant="secondary"
                onClick={() => openModal("yesRed")}
                disabled={!userDataTg?.id}
                title={!userDataTg?.id ? "Нет данных Telegram пользователя" : undefined}
              >
                Конечно!
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        placement="bottom"
        title={modalConfig.title}
        footer={modalConfig.footer}
        className={modalType === "noRed" ? "modal__panel--noRed" : undefined}
      >
        {modalConfig.body}
      </Modal>
    </div>
  );
}
