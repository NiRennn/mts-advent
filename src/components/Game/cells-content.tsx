import type { ReactNode } from "react";

export type CellContent = {
  title: string;
  body: ReactNode;
  ctaText: string;
};

export const COMMON_CELL_CONTENT: CellContent = {
  title: "Теперь ты участвуешь в сегодняшнем розыгрыше призов!",
  body: (
    <div>
      <p>Загляни завтра — вдруг именно твой ник окажется в списке победителей</p>
    </div>
  ),
  ctaText: "Ура!",
};
