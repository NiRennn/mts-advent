import { create } from "zustand";

export type ApiResponse = {
  data: {
    created: boolean;
    user_data: {
      mts_red_enter: boolean;
      user_state: {
        state: string;
        current_img: string;
        future_img: string;
      };
    };
  };
};

type ApiStore = {
  api: ApiResponse | null;
  setApi: (payload: ApiResponse) => void;
  clearApi: () => void;
};

export const useApiStore = create<ApiStore>((set) => ({
  api: null,
  setApi: (payload) => set({ api: payload }),
  clearApi: () => set({ api: null }),
}));


