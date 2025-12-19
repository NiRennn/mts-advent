import { create } from "zustand";

export type FaqItemApi = {
  question_title: string;
  answer_text: string;
};

export type FaqResponseApi = {
  status: boolean;
  data: FaqItemApi[];
};

type FaqStore = {
  faq: FaqResponseApi | null;
  isLoading: boolean;
  error: string | null;
  lastUserId: number | null;
  fetchFaq: (userId: number) => Promise<void>;
};

const FAQ_ENDPOINT = "https://mts-advent-25.despbots.ru/api/faq/";

export const useFaqStore = create<FaqStore>((set, get) => ({
  faq: null,
  isLoading: false,
  error: null,
  lastUserId: null,

  fetchFaq: async (userId) => {
    if (!Number.isFinite(userId)) {
      set({ error: "Некорректный user_id", isLoading: false });
      return;
    }

    const { lastUserId, faq } = get();
    if (lastUserId === userId && faq?.status) return;

    set({ isLoading: true, error: null, lastUserId: userId });

    try {
      const url = new URL(FAQ_ENDPOINT);
      url.searchParams.set("user_id", String(userId));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Authorization: tg?.initData,
        },
      });

      const raw: any = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.detail ?? raw?.message ?? `HTTP ${res.status}`);
      }

      const items: FaqItemApi[] = Array.isArray(raw?.data?.faq_questions)
        ? raw.data.faq_questions
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      set({
        faq: { status: Boolean(raw?.status), data: items },
        isLoading: false,
        error: null,
      });
    } catch (e: any) {
      set({ error: e?.message ?? "Ошибка загрузки FAQ", isLoading: false });
    }
  },
}));
