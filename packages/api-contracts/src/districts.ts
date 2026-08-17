import { z } from 'zod';

export const DistrictStatusSchema = z.enum([
  'SETUP_INCOMPLETE',
  'ACTIVE',
  'SUSPENDED',
  'CANCELLED',
]);
export type DistrictStatus = z.infer<typeof DistrictStatusSchema>;

export const DistrictSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.string().optional(),
  status: DistrictStatusSchema,
  createdAt: z.string().datetime(), // UTC ISO 8601 — frontend converts to Asia/Tashkent
});
export type District = z.infer<typeof DistrictSchema>;

export const CreateDistrictRequestSchema = z.object({
  // P1-C: .trim() first, then code-point length refines using spread [...val].length (B10)
  name: z
    .string({
      required_error: 'Туман номи киритилиши шарт.',
      invalid_type_error: 'Туман номи матн кўринишида бўлиши керак.',
    })
    .trim()
    .refine((val) => [...val].length >= 2, {
      message: 'Туман номи камида 2 та белгидан иборат бўлиши керак.',
    })
    .refine((val) => [...val].length <= 100, {
      message: 'Туман номи 100 та белгидан ошмаслиги керак.',
    }),
  region: z
    .string({
      invalid_type_error: 'Вилоят/ҳудуд номи матн кўринишида бўлиши керак.',
    })
    .trim()
    .refine((val) => [...val].length <= 100, {
      message: 'Вилоят/ҳудуд номи 100 та белгидан ошмаслиги керак.',
    })
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
});
export type CreateDistrictRequest = z.infer<typeof CreateDistrictRequestSchema>;

export const CreateDistrictResponseSchema = z.object({
  district: DistrictSchema,
});
export type CreateDistrictResponse = z.infer<typeof CreateDistrictResponseSchema>;

export const ListDistrictsResponseSchema = z.object({
  districts: z.array(DistrictSchema),
});
export type ListDistrictsResponse = z.infer<typeof ListDistrictsResponseSchema>;

export const GetDistrictResponseSchema = z.object({
  district: DistrictSchema,
});
export type GetDistrictResponse = z.infer<typeof GetDistrictResponseSchema>;
