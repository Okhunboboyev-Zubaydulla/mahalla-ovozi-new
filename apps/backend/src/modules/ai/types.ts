import type { ZodType } from 'zod';

export type AiGatewayErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_OUTPUT_SYNTAX'
  | 'INVALID_OUTPUT_SEMANTICS'
  | 'CONTEXT_LIMIT_EXCEEDED'
  | 'PROVIDER_REFUSAL'
  | 'AUTHENTICATION_ERROR'
  | 'STALE_SNAPSHOT'
  | 'PROFILE_NOT_FOUND'
  | 'CIRCUIT_OPEN';

export class AiGatewayError extends Error {
  public readonly code: AiGatewayErrorCode;
  public readonly status: number;
  public readonly retryable: boolean;
  public readonly provider?: string;
  public readonly modelId?: string;

  constructor(
    code: AiGatewayErrorCode,
    message: string,
    options?: {
      status?: number;
      retryable?: boolean;
      provider?: string;
      modelId?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'AiGatewayError';
    this.code = code;
    this.status = options?.status ?? 500;
    this.retryable = options?.retryable ?? false;
    this.provider = options?.provider;
    this.modelId = options?.modelId;
    if (options?.cause) {
      this.cause = options?.cause;
    }
  }
}

export interface GenerateStructuredOptions<T> {
  operationType: 'SEMANTIC_RELEVANCE' | 'TOPIC_MATCHING' | 'TOPIC_DERIVED_PROJECTION';
  profileId?: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  schemaName: string;
  deadlineMs?: number;
}

export interface ProviderAttemptRecord {
  attemptNumber: number;
  provider: string;
  modelId: string;
  providerRequestId?: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  estimatedCostUsd?: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'REFUSAL';
  errorCode?: AiGatewayErrorCode;
  sanitizedErrorMessage?: string;
}

export interface AiGatewayResult<T> {
  data: T;
  profileId: string;
  provider: string;
  modelId: string;
  providerRequestId?: string;
  durationMs: number;
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  };
  estimatedCostUsd: number;
  attempts: ProviderAttemptRecord[];
}

export interface RawProviderPayload {
  systemPrompt: string;
  userPrompt: string;
  compiledSchema: Record<string, unknown>;
  schemaName: string;
  modelId: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface RawProviderResponse {
  rawContent: string;
  providerRequestId?: string;
  durationMs: number;
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
  };
}

export interface AiProviderAdapterPort {
  providerName: 'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA' | 'MOCK';
  executeRequest(payload: RawProviderPayload): Promise<RawProviderResponse>;
}
