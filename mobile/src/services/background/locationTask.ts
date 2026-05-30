import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { apiBaseUrl } from '../config/apiConfig';
import { sessionStorage } from '../storage/sessionStorage';

export const DRIVER_BACKGROUND_LOCATION_TASK = 'drive-home-driver-background-location';
const LOCATION_UPDATE_INTERVAL_MS = 4000;
const LOCATION_UPDATE_DISTANCE_METERS = 8;

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

const postDriverLocation = async (latitude: number, longitude: number) => {
  const session = await sessionStorage.load();
  if (!session?.accessToken || session.user.role !== 'driver') {
    console.info('Skipping background location sync because no driver session is available.');
    return;
  }

  const response = await fetch(`${apiBaseUrl}/api/drivers/location`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: ['Bearer', session.accessToken].join(' '),
    },
    body: JSON.stringify({ lat: latitude, lng: longitude }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    throw new Error(
      `background location sync failed for ${apiBaseUrl}/api/drivers/location with status ${response.status}${responseBody ? `: ${responseBody}` : ''}`
    );
  }
};

if (!TaskManager.isTaskDefined(DRIVER_BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(DRIVER_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      return;
    }

    const locations = (data as LocationTaskData | undefined)?.locations;
    const latestLocation = locations?.[locations.length - 1];
    if (!latestLocation) {
      return;
    }

    try {
      await postDriverLocation(latestLocation.coords.latitude, latestLocation.coords.longitude);
    } catch {
      // best effort background sync
    }
  });
}

export const syncDriverLocationInBackground = async (enabled: boolean) => {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);

  if (!enabled) {
    if (started) {
      await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
    }
    return;
  }

  const foregroundPermission = await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== Location.PermissionStatus.GRANTED) {
    return;
  }

  const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== Location.PermissionStatus.GRANTED) {
    return;
  }

  if (started) {
    return;
  }

  await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: LOCATION_UPDATE_INTERVAL_MS,
    distanceInterval: LOCATION_UPDATE_DISTANCE_METERS,
    pausesUpdatesAutomatically: false,
    ...(Platform.OS === 'android'
      ? {
          foregroundService: {
            notificationTitle: 'Drive Home is keeping you online',
            notificationBody: 'Location updates stay active so requests and trip progress remain timely.',
          },
        }
      : {}),
  });
};
