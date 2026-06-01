import { apiClient } from './client';

export type QuickReplyTemplate = {
  id: string;
  label: string;
  content: string;
};

export type CallSession = {
  id: string;
  rideId?: string;
  callerId: string;
  calleeId: string;
  status: 'initiated' | 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  callType: 'voip' | 'native';
  startedAt?: string;
  endedAt?: string;
  durationSecs?: number;
  createdAt: string;
  updatedAt: string;
};

export const chatApi = {
  quickReplies() {
    return apiClient.get<QuickReplyTemplate[]>('/api/chat/quick-replies', { auth: true });
  },

  initiateCall(calleeId: string, rideId?: string) {
    return apiClient.post<CallSession>('/api/chat/calls', { calleeId, callType: 'native', rideId }, { auth: true });
  },
};
