import { z } from 'zod';

export const TelegramBotStatusSchema = z.enum(['VALID', 'INVALID']);
export type TelegramBotStatus = z.infer<typeof TelegramBotStatusSchema>;

export const TelegramBotInfoSchema = z.object({
  id: z.string().min(1),
  districtId: z.string().min(1),
  botId: z.string().min(1),
  botUsername: z.string().nullable(),
  botFirstName: z.string().min(1),
  tokenMasked: z.string().min(1),
  status: TelegramBotStatusSchema,
  lastValidatedAt: z.string().datetime(), // ISO 8601 UTC
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TelegramBotInfo = z.infer<typeof TelegramBotInfoSchema>;

export const ConnectTelegramBotRequestSchema = z.object({
  token: z
    .string({
      required_error: 'Telegram бот токени киритилиши шарт.',
      invalid_type_error: 'Telegram бот токени матн кўринишида бўлиши керак.',
    })
    .trim()
    .min(1, 'Telegram бот токени киритилиши шарт.')
    .max(100, 'Telegram бот токени 100 та белгидан ошмаслиги керак.'),
});
export type ConnectTelegramBotRequest = z.infer<typeof ConnectTelegramBotRequestSchema>;

export const GetTelegramBotResponseSchema = z.object({
  bot: TelegramBotInfoSchema.nullable(),
});
export type GetTelegramBotResponse = z.infer<typeof GetTelegramBotResponseSchema>;

export const ConnectTelegramBotResponseSchema = z.object({
  bot: TelegramBotInfoSchema,
});
export type ConnectTelegramBotResponse = z.infer<typeof ConnectTelegramBotResponseSchema>;

export const DisconnectTelegramBotResponseSchema = z.object({
  success: z.boolean(),
  disconnectedBotId: z.string(),
});
export type DisconnectTelegramBotResponse = z.infer<typeof DisconnectTelegramBotResponseSchema>;
