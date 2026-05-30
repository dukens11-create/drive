import { create } from 'zustand';

type PassengerAppState = {
  isFirstTimeUser: boolean;
  activePromoCode: string;
  scheduledRideCount: number;
  setFirstTimeUser: (value: boolean) => void;
  setPromoCode: (value: string) => void;
  incrementScheduledRide: () => void;
};

export const usePassengerStore = create<PassengerAppState>((set) => ({
  isFirstTimeUser: true,
  activePromoCode: '',
  scheduledRideCount: 0,
  setFirstTimeUser: (value) => set({ isFirstTimeUser: value }),
  setPromoCode: (value) => set({ activePromoCode: value.trim().toUpperCase() }),
  incrementScheduledRide: () => set((state) => ({ scheduledRideCount: state.scheduledRideCount + 1 })),
}));
