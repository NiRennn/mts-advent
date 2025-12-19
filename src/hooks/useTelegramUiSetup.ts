import { useEffect, useRef } from "react";

const MOBILE_PLATFORMS = new Set(["android", "ios", "android_x", "unigram"]);
const DESKTOP_PLATFORMS = new Set(["tdesktop", "weba", "webk", "unknown"]);

export function useTelegramUiSetup() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const tg = (window as any)?.Telegram?.WebApp ?? null;
    if (!tg) return;

    try {
      tg.ready?.();
    } catch {}

    try {
      tg.expand?.();
    } catch {}

    try {
      const platform: string | undefined = tg.platform;

      if (platform && MOBILE_PLATFORMS.has(platform)) {
        tg.requestFullscreen?.();
        tg.lockOrientation?.();
      } else if (!platform || DESKTOP_PLATFORMS.has(platform)) {
        tg.exitFullscreen?.();
        tg.setMinimumHeight?.(700);
      }
    } catch {}

    try {
      tg.disableVerticalSwipes?.();
    } catch {}

    try {
      tg.setHeaderColor?.("#f3f9ff");
      tg.setBackgroundColor?.("#f3f9ff");
      tg.setBottomBarColor?.("#f3f9ff");
    } catch {}
  }, []);
}
