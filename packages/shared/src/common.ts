import { z } from 'zod';

/** A calendar date, YYYY-MM-DD, in the user's own time zone. */
export const LocalDateSchema = z.iso.date();
export type LocalDate = z.infer<typeof LocalDateSchema>;

/** Route params with a numeric `id`. */
export const IdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Names typed by people (or Claude): trimmed, non-empty. */
export const NameSchema = z.string().trim().min(1, 'Name is required').max(120);
