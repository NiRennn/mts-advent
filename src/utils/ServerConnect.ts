// src/api/ServerConnect.ts

type TgWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    start_param?: string;
  };
};

export type GetUserArgs = {
  url: "users";
  user_firstname: string;
  user_id: number;
  user_lastname: string;
  user_username: string;
  utm_mark: string;
};

export type TgUserPayload = {
  user_id: number;
  user_firstname: string;
  user_lastname: string;
  user_username: string;
  utm_mark: string;
  initData?: string;
};

function getTg(): TgWebApp | null {
  return (window as any)?.Telegram?.WebApp ?? null;
}

function buildApiUrl(path: string) {
  // VITE_API_ORIGIN=https://mts-advent-25.despbots.ru
  const origin =
    (import.meta as any)?.env?.VITE_API_ORIGIN ?? "https://mts-advent-25.despbots.ru";

  const normalized = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${origin}/api/${normalized}/`;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractTgUserPayload(): TgUserPayload {
  const tg = getTg();
  const user = tg?.initDataUnsafe?.user;

  if (!tg || !user?.id) {
    throw new Error("Telegram WebApp user not found (tg.initDataUnsafe.user).");
  }

  return {
    user_id: Number(user.id),
    user_firstname: user.first_name ?? "",
    user_lastname: user.last_name ? String(user.last_name) : "",
    user_username: user.username ? String(user.username) : "",
    utm_mark:
      typeof tg.initDataUnsafe?.start_param === "undefined"
        ? ""
        : String(tg.initDataUnsafe.start_param),
    initData: tg.initData,
  };
}

export default class ServerConnect {

  static async getUser(args: GetUserArgs) {
    const url = new URL(buildApiUrl(args.url));

    url.searchParams.set("user_id", String(args.user_id));
    url.searchParams.set("user_firstname", args.user_firstname);
    url.searchParams.set("user_lastname", args.user_lastname);
    url.searchParams.set("user_username", args.user_username);
    url.searchParams.set("utm_mark", args.utm_mark);


    // const tg = getTg();
    // const initData = tg?.initData ?? "";

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // "Authorization": initData,
        // "X-Telegram-Init-Data": initData,
      },
    });

    const raw = await safeJson(res);

    if (!res.ok) {
      const msg =
        (raw as any)?.detail ??
        (raw as any)?.message ??
        `GET ${url.toString()} → HTTP ${res.status}`;
      throw new Error(msg);
    }

    return raw;
  }


  static async getUserFromTelegram() {
    const p = extractTgUserPayload();

    return this.getUser({
      url: "users",
      user_firstname: p.user_firstname,
      user_id: p.user_id,
      user_lastname: p.user_lastname,
      user_username: p.user_username,
      utm_mark: p.utm_mark,
    });
  }


  static getTelegramUserPayload(): TgUserPayload {
    return extractTgUserPayload();
  }
}
