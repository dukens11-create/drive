import { apiClient } from './client';
import type { ApiEnvelope } from '../../types/api';

type LedgerEntry = {
  id: string;
  kind: 'credit' | 'debit';
  amountCents: number;
  reason: string;
  createdAt: string;
};

type BankAccount = {
  id: string;
  userId: string;
  bankName: string;
  accountHolderName: string;
  accountType: 'checking' | 'savings';
  routingNumber: string;
  last4: string;
  nickname?: string;
  isDefault: boolean;
  stripeExternalAccountId?: string;
  createdAt: string;
  updatedAt: string;
};

type PayoutRequest = {
  id: string;
  userId: string;
  bankAccountId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'canceled';
  walletTxId?: string;
  stripePayoutId?: string;
  failureReason?: string;
  scheduledAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

type WeeklySummary = {
  userId: string;
  weekStart: string;
  grossEarningsCents: number;
  debitsCents: number;
  netEarningsCents: number;
  withdrawnCents: number;
  pendingPayoutCents: number;
  tripsCount: number;
  avgPerTripCents: number;
  balanceCents: number;
};

export const walletApi = {
  ledger(userId: string) {
    return apiClient.post<ApiEnvelope<{ entries: LedgerEntry[] }>>('/api/wallet/ledger', { userId }, { auth: true });
  },
  balance(userId: string) {
    return apiClient.post<ApiEnvelope<{ balanceCents: number }>>('/api/wallet/balance', { userId }, { auth: true });
  },
  weeklySummary(userId: string) {
    return apiClient.post<ApiEnvelope<WeeklySummary>>('/api/wallet/weekly-summary', { userId }, { auth: true });
  },
  addBankAccount(params: {
    userId: string;
    bankName: string;
    accountHolderName: string;
    accountType: 'checking' | 'savings';
    routingNumber: string;
    accountNumber: string;
    nickname?: string;
    isDefault?: boolean;
  }) {
    return apiClient.post<ApiEnvelope<{ bankAccount: BankAccount }>>('/api/wallet/add-bank-account', params, { auth: true });
  },
  listBankAccounts(userId: string) {
    return apiClient.post<ApiEnvelope<{ accounts: BankAccount[] }>>('/api/wallet/list-bank-accounts', { userId }, { auth: true });
  },
  removeBankAccount(userId: string, bankAccountId: string) {
    return apiClient.post<ApiEnvelope<{ bankAccountId: string }>>('/api/wallet/remove-bank-account', { userId, bankAccountId }, { auth: true });
  },
  setDefaultBankAccount(userId: string, bankAccountId: string) {
    return apiClient.post<ApiEnvelope<{ bankAccount: BankAccount }>>('/api/wallet/set-default-bank-account', { userId, bankAccountId }, { auth: true });
  },
  withdraw(params: { userId: string; amountCents: number; bankAccountId?: string; currency?: string }) {
    return apiClient.post<ApiEnvelope<{ payout: PayoutRequest; balanceCents: number }>>('/api/wallet/withdraw', params, { auth: true });
  },
  payoutHistory(userId: string) {
    return apiClient.post<ApiEnvelope<{ payouts: PayoutRequest[] }>>('/api/wallet/payout-history', { userId }, { auth: true });
  },
};
