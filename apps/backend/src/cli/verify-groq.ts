import 'dotenv/config';
import { AiGateway } from '../modules/ai/ai-gateway.js';
import { HttpProviderAdapter } from '../adapters/ai-providers/http-provider-adapter.js';
import {
  SemanticRelevanceResultSchema,
  SEMANTIC_RELEVANCE_SYSTEM_PROMPT,
} from '../modules/ai/semantic-relevance-evaluator.js';
import type { AiProfile } from '../adapters/db/schema/ai.js';

export async function verifyGroqConnection(): Promise<void> {
  console.log('\n==============================================================');
  console.log('            GROQ CLOUD LIVE INTEGRATION VERIFICATION          ');
  console.log('==============================================================\n');

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ Error: GROQ_API_KEY is not defined in your environment or apps/backend/.env file.');
    process.exit(1);
  }

  const maskedKey = `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
  const modelId = process.env.AI_MODEL_ID || 'llama-3.3-70b-versatile';

  console.log(`Provider:        GROQ Cloud`);
  console.log(`API Key:         ${maskedKey}`);
  console.log(`Target Model:    ${modelId}`);
  console.log(`Base URL:        ${process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'}`);
  console.log('--------------------------------------------------------------\n');

  const groqAdapter = new HttpProviderAdapter('GROQ');
  const customAdapters = new Map([['GROQ', groqAdapter]]);

  const verificationProfile: AiProfile = {
    id: 'prof_groq_verify_v1',
    version: 1,
    operationType: 'SEMANTIC_RELEVANCE',
    provider: 'GROQ',
    modelId,
    promptVersion: 'prom_rel_v1',
    schemaVersion: 'sch_rel_v1',
    temperature: 0.0,
    maxOutputTokens: 500,
    timeoutMs: 15000,
    retryPolicy: {
      maxAttempts: 3,
      backoffFactor: 2,
      initialDelayMs: 1000,
    },
    capabilities: {
      structuredOutputs: true,
      jsonSchemaMode: 'strict',
    },
    isActive: true,
    createdAt: new Date(),
  };

  const defaultProfiles = new Map([['prof_groq_verify_v1', verificationProfile]]);
  const gateway = new AiGateway({ customAdapters, defaultProfiles });

  const testCivicComplaint =
    'Ассалому алайкум, маҳалламизда 3 кундан бери тоза ичимлик суви йўқ, марказий қувур ёрилиб кўчани сув босди. Илтимос, тезроқ таъмирлаб беринглар.';

  console.log(`Testing civic message (Uzbek Cyrillic):`);
  console.log(`"${testCivicComplaint}"\n`);
  console.log('Sending request to Groq Cloud API with strict JSON Schema...');

  const startTime = performance.now();
  try {
    const result = await gateway.generateStructured({
      operationType: 'SEMANTIC_RELEVANCE',
      profileId: 'prof_groq_verify_v1',
      systemPrompt: SEMANTIC_RELEVANCE_SYSTEM_PROMPT,
      userPrompt: `### CANDIDATE INTAKE TEXT\n"${testCivicComplaint}"\n\nAnalyze the candidate message above and return the semantic relevance decision.`,
      schema: SemanticRelevanceResultSchema,
      schemaName: 'semantic_relevance_result',
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    console.log('\n✅ Groq Response Received Successfully!\n');
    console.log('Decoded Structured Result:');
    console.dir(result.data, { depth: null, colors: true });
    console.log('\n--------------------------------------------------------------');
    console.log(`Latency:         ${result.durationMs}ms (Roundtrip: ${elapsedMs}ms)`);
    console.log(`Input Tokens:    ${result.tokens.inputTokens}`);
    console.log(`Output Tokens:   ${result.tokens.outputTokens}`);
    console.log(`Cached Tokens:   ${result.tokens.cachedTokens || 0}`);
    console.log(`Estimated Cost:  $${result.estimatedCostUsd.toFixed(6)} USD`);
    console.log(`Attempts Made:   ${result.attempts.length}`);
    console.log('==============================================================\n');
  } catch (error: any) {
    console.error('\n❌ Groq Execution Failed:', error?.message || error);
    if (error?.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

verifyGroqConnection().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
