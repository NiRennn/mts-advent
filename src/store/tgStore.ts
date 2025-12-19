import { create } from "zustand";

export type TgUserData = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  utm_mark: string;
};

type TgStore = {
  tg: any | null;
  userDataTg: TgUserData | null;

  hydrateFromTelegram: () => void;
  clear: () => void;
};

export const useTgStore = create<TgStore>((set) => ({
  tg: null,
  userDataTg: null,

  hydrateFromTelegram: () => {
    const tg = (window as any)?.Telegram?.WebApp ?? null;
    const user = tg?.initDataUnsafe?.user;

    if (!tg || !user?.id) {
      set({ tg, userDataTg: null });
      return;
    }

    set({
      tg,
      userDataTg: {
        id: Number(user.id),
        first_name: user.first_name ?? "",
        last_name: user.last_name ? String(user.last_name) : "",
        username: user.username ? String(user.username) : "",
        utm_mark:
          typeof tg.initDataUnsafe.start_param === "undefined"
            ? ""
            : String(tg.initDataUnsafe.start_param),
      },
    });
  },

  clear: () => set({ tg: null, userDataTg: null }),
}));
