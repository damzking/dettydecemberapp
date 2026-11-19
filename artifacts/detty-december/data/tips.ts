// Filter choices only. Tip content is read from the backend.
export const TIP_CATEGORIES = ['All', 'Scams', 'Money', 'Transport', 'Safety', 'Health'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];
