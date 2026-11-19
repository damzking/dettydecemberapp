// Filter choices and types only. Content is read from the backend.
export type { Idea } from '@workspace/api-client-react';
export type City = 'Lagos' | 'Abuja';
export type Category = 'Coffee' | 'Parties' | 'Sports' | 'Events';
export const CITIES: City[] = ['Lagos', 'Abuja'];
export const CATEGORIES: Category[] = ['Coffee', 'Parties', 'Sports', 'Events'];
