import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import api from './api';

const BACKGROUND_MONITOR_TASK = 'BACKGROUND_MONITOR_TASK';
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const LAST_SEEN_THREAT_KEY = 'lastSeenThreatTs';

// Only call expo-notifications in production builds — it crashes in Expo Go SDK 53+
if (!IS_EXPO_GO) {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Define the background task — safe to register even in Expo Go (just won't execute)
TaskManager.defineTask(BACKGROUND_MONITOR_TASK, async () => {
  try {
    console.log('Background task running: Checking for new threats...');

    const token = await SecureStore.getItemAsync('userToken');
    if (!token) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const res = await api.get('/dashboard/threats?skip=0&limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const threats = res.data?.threats || [];

    if (!threats.length) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const lastSeen = await SecureStore.getItemAsync(LAST_SEEN_THREAT_KEY);
    const newestTs = new Date(threats[0].created_at).getTime();

    const isNew = !lastSeen || newestTs > Number(lastSeen);
    if (isNew) {
      const threat = threats[0];
      const level = threat.threat_level || 'UNKNOWN';
      if (!IS_EXPO_GO) {
        const Notifications = require('expo-notifications');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${level} Risk Threat Detected`,
            body: `${threat.channel || 'Message'} from ${threat.sender || 'unknown'} — risk ${Math.round(threat.risk_score || 0)}/10`,
          },
          trigger: null,
        });
      }
      await SecureStore.setItemAsync(LAST_SEEN_THREAT_KEY, String(newestTs));
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundTasks = async () => {
  if (IS_EXPO_GO) {
    console.log('Background tasks skipped in Expo Go.');
    return;
  }
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_MONITOR_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background monitoring registered successfully.');
  } catch (err) {
    console.log('Background task registration skipped:', err.message);
  }
};
