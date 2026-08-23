import { describe, it, expect } from 'vitest';
import {
  QualifyingLaneSchema,
  TelegramReplyMetadataSchema,
  CursorPaginationQuerySchema,
  CursorPaginationMetaSchema,
  ApiErrorEnvelopeSchema,
  DistrictActivationBlockedErrorEnvelopeSchema,
} from '../src/index.js';

describe('Topics and Pagination Contracts', () => {
  it('validates all 5 civic qualifying lanes', () => {
    const lanes = ['WATER', 'ELECTRICITY', 'GAS', 'WASTE', 'HOKIM_RELATED'];
    for (const lane of lanes) {
      expect(QualifyingLaneSchema.parse(lane)).toBe(lane);
    }
    expect(() => QualifyingLaneSchema.parse('INVALID_LANE')).toThrow();
  });

  it('validates telegram reply metadata schema', () => {
    const valid = {
      replyToMessageId: '12345',
      replyToUserId: '67890',
      replyToIsForwarded: false,
      replyToIsBot: true,
    };
    expect(TelegramReplyMetadataSchema.parse(valid)).toEqual(valid);
  });

  it('validates keyset cursor pagination query schema with defaults', () => {
    const parsed = CursorPaginationQuerySchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.direction).toBe('forward');
    expect(parsed.cursor).toBeUndefined();
  });

  it('validates decoupled generic error envelope and activation blocked envelope', () => {
    const genericErr = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access denied',
        details: { attempts: 3 },
      },
    };
    expect(ApiErrorEnvelopeSchema.parse(genericErr)).toEqual(genericErr);

    const activationErr = {
      error: {
        code: 'DISTRICT_NOT_READY' as const,
        message: 'Prerequisites incomplete',
        blockers: [
          {
            key: 'telegram_bot' as const,
            label: 'Bot',
            description: 'Connect bot',
            status: 'incomplete' as const,
          },
        ],
      },
    };
    expect(DistrictActivationBlockedErrorEnvelopeSchema.parse(activationErr)).toEqual(activationErr);
  });
});
