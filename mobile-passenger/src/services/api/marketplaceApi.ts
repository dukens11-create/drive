import { apiClient } from './client';
import type { ApiEnvelope } from '../../types/api';

type Promo = {
  id: string;
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  usageCount: number;
};

type ReferralEvent = {
  id: string;
  referredUserId: string;
  bonusCents: number;
  paid: boolean;
  createdAt: string;
};

export const marketplaceApi = {
  getReferralCode() {
    return apiClient.get<ApiEnvelope<{ referralCode: string }>>('/api/marketplace/referral/code', { auth: true });
  },

  listReferrals() {
    return apiClient.get<ApiEnvelope<{ referrals: ReferralEvent[]; totalBonusCents: number }>>('/api/marketplace/referral/list', { auth: true });
  },

  listPromos() {
    return apiClient.get<ApiEnvelope<{ promos: Promo[] }>>('/api/marketplace/promos', { auth: true });
  },
};
