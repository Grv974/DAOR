import { nanoid } from 'nanoid';

/** Generate a short, URL-safe, collision-resistant id. */
export const newId = (): string => nanoid(12);
