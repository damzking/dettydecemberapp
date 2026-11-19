// The three pass options shown on the pricing screen.
export interface Pass { id: 'day' | 'week' | 'month'; name: string; price: number; days: number; length: string; note?: string }
export const PASSES: Pass[] = [
  { id: 'day', name: 'Day pass', price: 3, days: 1, length: '24 hours' },
  { id: 'week', name: 'Weekly pass', price: 6, days: 7, length: '7 days', note: 'Cheaper than 3 day passes' },
  { id: 'month', name: 'Monthly pass', price: 10, days: 30, length: '30 days', note: 'Best value' },
];
