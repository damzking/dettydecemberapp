// Sample Ideas list. Swap the [BRACKET] placeholders for real content later.
export type City = 'Lagos' | 'Abuja';
export type Category = 'Coffee' | 'Parties' | 'Sports' | 'Events';

export interface Idea {
  id: string;
  city: City;
  category: Category;
  title: string;
  area: string;
  priceLevel: string;
  blurb: string;
  verified: string;
  seller?: string; // "Tix" on event items
}

export const CITIES: City[] = ['Lagos', 'Abuja'];
export const CATEGORIES: Category[] = ['Coffee', 'Parties', 'Sports', 'Events'];

const NAMES: Record<Category, string> = {
  Coffee: 'Coffee spot name',
  Parties: 'Party name',
  Sports: 'Sports spot name',
  Events: 'Event name',
};

// Helper so every item has the same placeholder shape.
function make(city: City, category: Category, n: number): Idea {
  return {
    id: `${city.toLowerCase()}-${category.toLowerCase()}-${n}`,
    city,
    category,
    title: `[${NAMES[category]} ${n}]`,
    area: '[Area]',
    priceLevel: '[Price level]',
    blurb: '[One-line blurb goes here]',
    verified: '[DATE]',
    seller: category === 'Events' ? 'Tix' : undefined,
  };
}

// 24 items: 12 per city, 3 per category per city.
export const IDEAS: Idea[] = CITIES.flatMap((city) =>
  CATEGORIES.flatMap((cat) => [1, 2, 3].map((n) => make(city, cat, n)))
);
