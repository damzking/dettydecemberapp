// Sample survival tips. Replace the [BRACKET] text with real tips later.
export const TIP_CATEGORIES = ['All', 'Scams', 'Money', 'Transport', 'Safety', 'Health'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export interface Tip {
  id: string;
  category: Exclude<TipCategory, 'All'>;
  title: string;
  body: string;
}

export const TIPS: Tip[] = [
  { id: 't1', category: 'Scams', title: "[This week's alert goes here]", body: '[Scam tip detail goes here]' },
  { id: 't2', category: 'Scams', title: '[Scam tip title]', body: '[Scam tip detail goes here]' },
  { id: 't3', category: 'Money', title: '[Money tip title]', body: '[Money tip detail goes here]' },
  { id: 't4', category: 'Money', title: '[Money tip title]', body: '[Money tip detail goes here]' },
  { id: 't5', category: 'Transport', title: '[Transport tip title]', body: '[Transport tip detail goes here]' },
  { id: 't6', category: 'Transport', title: '[Transport tip title]', body: '[Transport tip detail goes here]' },
  { id: 't7', category: 'Safety', title: '[Safety tip title]', body: '[Safety tip detail goes here]' },
  { id: 't8', category: 'Health', title: '[Health tip title]', body: '[Health tip detail goes here]' },
];
