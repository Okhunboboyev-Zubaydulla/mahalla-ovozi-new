import {
  type AiProviderAdapterPort,
  type RawProviderPayload,
  type RawProviderResponse,
  AiGatewayError,
} from '../../modules/ai/types.js';

export class HttpProviderAdapter implements AiProviderAdapterPort {
  public readonly providerName: 'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA';

  constructor(providerName: 'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA') {
    this.providerName = providerName;
  }

  public async executeRequest(payload: RawProviderPayload): Promise<RawProviderResponse> {
    const startTime = performance.now();
    const timeoutMs = payload.timeoutMs || 10000;

    let url: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: Record<string, any>;

    switch (this.providerName) {
      case 'OPENAI': {
        const baseUrl = payload.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        url = `${baseUrl}/chat/completions`;
        const apiKey = payload.apiKey || process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
          throw new AiGatewayError('AUTHENTICATION_ERROR', 'OpenAI API key is missing', {
            status: 401,
            retryable: false,
            provider: 'OPENAI',
            modelId: payload.modelId,
          });
        }
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: payload.modelId,
          messages: [
            { role: 'system', content: payload.systemPrompt },
            { role: 'user', content: payload.userPrompt },
          ],
          temperature: payload.temperature,
          max_tokens: payload.maxOutputTokens,
          response_format: payload.compiledSchema,
        };
        break;
      }

      case 'GROQ': {
        const baseUrl = payload.baseUrl || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
        url = `${baseUrl}/chat/completions`;
        const apiKey = payload.apiKey || process.env.GROQ_API_KEY || '';
        if (!apiKey) {
          throw new AiGatewayError('AUTHENTICATION_ERROR', 'Groq API key is missing', {
            status: 401,
            retryable: false,
            provider: 'GROQ',
            modelId: payload.modelId,
          });
        }
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: payload.modelId,
          messages: [
            { role: 'system', content: payload.systemPrompt },
            { role: 'user', content: payload.userPrompt },
          ],
          temperature: payload.temperature,
          max_tokens: payload.maxOutputTokens,
          response_format: payload.compiledSchema,
        };
        break;
      }

      case 'GEMINI': {
        const baseUrl =
          payload.baseUrl ||
          process.env.GEMINI_BASE_URL ||
          'https://generativelanguage.googleapis.com/v1beta';
        url = `${baseUrl}/models/${payload.modelId}:generateContent`;
        const apiKey = payload.apiKey || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new AiGatewayError('AUTHENTICATION_ERROR', 'Gemini API key is missing', {
            status: 401,
            retryable: false,
            provider: 'GEMINI',
            modelId: payload.modelId,
          });
        }
        headers['x-goog-api-key'] = apiKey;
        body = {
          contents: [
            {
              role: 'user',
              parts: [{ text: payload.userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: payload.systemPrompt }],
          },
          generationConfig: {
            temperature: payload.temperature,
            maxOutputTokens: payload.maxOutputTokens,
            ...payload.compiledSchema,
          },
        };
        break;
      }

      case 'OLLAMA': {
        const baseUrl = payload.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        url = `${baseUrl}/api/chat`;
        body = {
          model: payload.modelId,
          messages: [
            { role: 'system', content: payload.systemPrompt },
            { role: 'user', content: payload.userPrompt },
          ],
          stream: false,
          options: {
            temperature: payload.temperature,
            num_predict: payload.maxOutputTokens,
          },
          format: payload.compiledSchema,
        };
        break;
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      if (isTimeout) {
        throw new AiGatewayError(
          'PROVIDER_TIMEOUT',
          `AI Provider request timed out after ${timeoutMs}ms`,
          {
            status: 504,
            retryable: true,
            provider: this.providerName,
            modelId: payload.modelId,
            cause: err,
          },
        );
      }
      throw new AiGatewayError('NETWORK_ERROR', `Network error during AI request: ${err?.message}`, {
        status: 503,
        retryable: true,
        provider: this.providerName,
        modelId: payload.modelId,
        cause: err,
      });
    }

    const durationMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // ignore
      }

      if (response.status === 429) {
        throw new AiGatewayError('RATE_LIMIT_EXCEEDED', `AI Provider rate limit exceeded: ${errorBody}`, {
          status: 429,
          retryable: true,
          provider: this.providerName,
          modelId: payload.modelId,
        });
      }

      if (response.status === 401 || response.status === 403) {
        throw new AiGatewayError('AUTHENTICATION_ERROR', `AI Provider authentication error: ${errorBody}`, {
          status: response.status,
          retryable: false,
          provider: this.providerName,
          modelId: payload.modelId,
        });
      }

      if (response.status >= 500) {
        throw new AiGatewayError(
          'PROVIDER_SERVER_ERROR',
          `AI Provider internal server error (${response.status}): ${errorBody}`,
          {
            status: response.status,
            retryable: true,
            provider: this.providerName,
            modelId: payload.modelId,
          },
        );
      }

      if (response.status === 400 && errorBody.toLowerCase().includes('safety')) {
        throw new AiGatewayError('PROVIDER_REFUSAL', `AI Provider refused request: ${errorBody}`, {
          status: 400,
          retryable: false,
          provider: this.providerName,
          modelId: payload.modelId,
        });
      }

      throw new AiGatewayError('PROVIDER_SERVER_ERROR', `AI Provider error (${response.status}): ${errorBody}`, {
        status: response.status,
        retryable: false,
        provider: this.providerName,
        modelId: payload.modelId,
      });
    }

    const data = await response.json();
    return this.parseResponse(data, durationMs);
  }

  private parseResponse(data: any, durationMs: number): RawProviderResponse {
    switch (this.providerName) {
      case 'OPENAI':
      case 'GROQ': {
        const choice = data.choices?.[0];
        if (choice?.message?.refusal) {
          throw new AiGatewayError('PROVIDER_REFUSAL', `Model refused request: ${choice.message.refusal}`, {
            status: 400,
            retryable: false,
            provider: this.providerName,
          });
        }
        const rawContent = choice?.message?.content || '';
        return {
          rawContent,
          providerRequestId: data.id,
          durationMs,
          tokens: {
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
            cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
          },
        };
      }

      case 'GEMINI': {
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'RECITATION') {
          throw new AiGatewayError('PROVIDER_REFUSAL', `Gemini content policy refusal: ${candidate.finishReason}`, {
            status: 400,
            retryable: false,
            provider: 'GEMINI',
          });
        }
        const rawContent = candidate?.content?.parts?.[0]?.text || '';
        return {
          rawContent,
          providerRequestId: data.modelVersion,
          durationMs,
          tokens: {
            inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
            cachedTokens: data.usageMetadata?.cachedContentTokenCount ?? 0,
          },
        };
      }

      case 'OLLAMA': {
        const rawContent = data.message?.content || '';
        return {
          rawContent,
          durationMs,
          tokens: {
            inputTokens: data.prompt_eval_count ?? 0,
            outputTokens: data.eval_count ?? 0,
          },
        };
      }
    }
  }
}
