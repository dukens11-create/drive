import { apiClient } from './client';
import type { ApiEnvelope } from '../../types/api';

type LedgerEntry = {
  id: string;
  kind: 'credit' | 'debit';
  amountCents: number;
  reason: string;
  createdAt: string;
};

export const walletApi = {
  ledger(userId: string) {
    return apiClient.post<ApiEnvelope<{ entries: LedgerEntry[] }>>('/api/wallet/ledger', { userId }, { auth: true });
  },
};
