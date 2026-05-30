import { usePassengerStore } from '../../src/store/passengerStore';

describe('passengerStore', () => {
  beforeEach(() => {
    usePassengerStore.setState({
      isFirstTimeUser: true,
      activePromoCode: '',
      scheduledRideCount: 0,
    });
  });

  it('normalizes promo codes and tracks scheduled rides', () => {
    usePassengerStore.getState().setPromoCode('save20');
    usePassengerStore.getState().incrementScheduledRide();

    expect(usePassengerStore.getState().activePromoCode).toBe('SAVE20');
    expect(usePassengerStore.getState().scheduledRideCount).toBe(1);
  });
});
