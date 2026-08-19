export interface TestSession {
  districtId: string;
  groupId: string;
  chatId: string;
  botId: string;
  status: 'PENDING' | 'SUCCESS' | 'TIMEOUT' | 'FAILED';
  openedAt: Date;
  expiresAt: Date;
  testMessageReceivedAt?: Date;
  lastError?: string;
}

export interface CreateSessionParams {
  districtId: string;
  groupId: string;
  chatId: string;
  botId: string;
  ttlMs?: number;
}

export class TelegramTestSessionManager {
  private sessionsByGroup = new Map<string, TestSession>();
  private groupKeyByChatId = new Map<string, string>();

  private makeGroupKey(districtId: string, groupId: string): string {
    return `${districtId}:${groupId}`;
  }

  createSession(params: CreateSessionParams): TestSession {
    const groupKey = this.makeGroupKey(params.districtId, params.groupId);
    const ttl = params.ttlMs ?? 65_000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    // Clean up any existing mapping for this groupKey
    const existing = this.sessionsByGroup.get(groupKey);
    if (existing) {
      this.groupKeyByChatId.delete(existing.chatId);
    }

    const session: TestSession = {
      districtId: params.districtId,
      groupId: params.groupId,
      chatId: params.chatId,
      botId: params.botId,
      status: 'PENDING',
      openedAt: now,
      expiresAt,
    };

    this.sessionsByGroup.set(groupKey, session);
    this.groupKeyByChatId.set(params.chatId, groupKey);

    return session;
  }

  getSession(districtId: string, groupId: string): TestSession | null {
    const groupKey = this.makeGroupKey(districtId, groupId);
    const session = this.sessionsByGroup.get(groupKey);
    if (!session) return null;

    if (session.status === 'PENDING' && Date.now() > session.expiresAt.getTime()) {
      session.status = 'TIMEOUT';
      session.lastError = 'СинОВ вақти (60 сония) тугади. Ҳақиқий одам томонидан хабар юборилмади.';
      this.groupKeyByChatId.delete(session.chatId);
    }

    return session;
  }

  findActiveSessionByChatId(chatId: string): TestSession | null {
    const groupKey = this.groupKeyByChatId.get(chatId);
    if (!groupKey) return null;

    const session = this.sessionsByGroup.get(groupKey);
    if (!session) {
      this.groupKeyByChatId.delete(chatId);
      return null;
    }

    if (session.status === 'PENDING' && Date.now() > session.expiresAt.getTime()) {
      session.status = 'TIMEOUT';
      session.lastError = 'СинОВ вақти (60 сония) тугади. Ҳақиқий одам томонидан хабар юборилмади.';
      this.groupKeyByChatId.delete(chatId);
      return null;
    }

    if (session.status !== 'PENDING') {
      return null;
    }

    return session;
  }

  resolveSessionSuccess(
    districtId: string,
    groupId: string,
    receivedAt: Date = new Date(),
  ): TestSession | null {
    const groupKey = this.makeGroupKey(districtId, groupId);
    const session = this.sessionsByGroup.get(groupKey);
    if (!session) return null;

    session.status = 'SUCCESS';
    session.testMessageReceivedAt = receivedAt;
    session.lastError = undefined;
    this.groupKeyByChatId.delete(session.chatId);

    return session;
  }

  resolveSessionFailure(districtId: string, groupId: string, error: string): TestSession | null {
    const groupKey = this.makeGroupKey(districtId, groupId);
    const session = this.sessionsByGroup.get(groupKey);
    if (!session) return null;

    session.status = 'FAILED';
    session.lastError = error;
    this.groupKeyByChatId.delete(session.chatId);

    return session;
  }

  clear(): void {
    this.sessionsByGroup.clear();
    this.groupKeyByChatId.clear();
  }
}

// Global singleton instance for in-memory session tracking
export const globalTestSessionManager = new TelegramTestSessionManager();
