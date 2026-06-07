import type { IconType } from 'react-icons';

export type RideTypeId = 'economy' | 'comfort' | 'premium';

export type RideTypeOption = {
  id: RideTypeId;
  label: string;
  description: string;
  fareLine: string;
  accent: string;
  iconAccent: string;
};

export type RideStep = {
  id: string;
  label: string;
  icon: IconType;
};
