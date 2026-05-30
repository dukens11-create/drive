import { addressSuggestions } from './demo-data';
import type { AddressSuggestion } from './types';

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: { input: string },
              callback: (predictions: Array<{ place_id: string; structured_formatting?: { main_text?: string; secondary_text?: string } }> | null) => void,
            ) => void;
          };
        };
      };
    };
  }
}

export async function autocompleteAddresses(query: string): Promise<AddressSuggestion[]> {
  const value = query.trim();
  if (!value) {
    return addressSuggestions.slice(0, 4);
  }

  const autocompleteService = typeof window !== 'undefined' ? window.google?.maps?.places?.AutocompleteService : undefined;
  if (autocompleteService) {
    const service = new autocompleteService();
    return new Promise((resolve) => {
      service.getPlacePredictions({ input: value }, (predictions) => {
        if (!predictions?.length) {
          resolve(addressSuggestions.filter((entry) => `${entry.title} ${entry.subtitle}`.toLowerCase().includes(value.toLowerCase())).slice(0, 5));
          return;
        }

        resolve(
          predictions.slice(0, 5).map((prediction) => ({
            id: prediction.place_id,
            title: prediction.structured_formatting?.main_text || prediction.place_id,
            subtitle: prediction.structured_formatting?.secondary_text || 'Google Places result',
          })),
        );
      });
    });
  }

  return addressSuggestions.filter((entry) => `${entry.title} ${entry.subtitle}`.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
}
