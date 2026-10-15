import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { getAdUnit } from '../config/admobConfig';

// Watching one rewarded ad unlocks the free tools' limits for 24 hours.
// Purely on-device: no server call and no credits involved.
export const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;
export const FREE_DAILY_RESIZES = 3;

const UNLOCK_KEY = 'smartTools:unlockedUntil';
const USAGE_KEY = 'smartTools:resizeUsage';
const AD_LOAD_TIMEOUT_MS = 20000;

const today = () => new Date().toISOString().slice(0, 10);

export const isUnlocked = async () => {
  try {
    const until = Number(await AsyncStorage.getItem(UNLOCK_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch (e) {
    return false;
  }
};

export const grantUnlock = async () => {
  try {
    await AsyncStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_DURATION_MS));
  } catch (e) {
    // If storage fails the user just has to watch again.
  }
};

const readUsage = async () => {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.date === today()) return parsed.count;
  } catch (e) {
    // fall through
  }
  return 0;
};

export const getRemainingFreeResizes = async () => {
  if (await isUnlocked()) return Infinity;
  return Math.max(0, FREE_DAILY_RESIZES - (await readUsage()));
};

export const recordResize = async () => {
  try {
    const count = await readUsage();
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify({ date: today(), count: count + 1 }));
  } catch (e) {
    // Ignore: worst case the user gets one extra free resize.
  }
};

/**
 * Load and show a rewarded ad. Resolves { earned: boolean, failed: boolean }.
 * `failed` means the ad could not be shown (no fill, network), so the caller
 * can tell the user to retry rather than implying they skipped it.
 */
export const showRewardedAd = () =>
  new Promise(resolve => {
    const unitId = getAdUnit('rewarded');
    if (!unitId) {
      resolve({ earned: false, failed: true });
      return;
    }

    const ad = RewardedAd.createForAdRequest(unitId);
    let earned = false;
    let finished = false;
    let loadTimer = null;
    const unsubscribers = [];

    const finish = failed => {
      if (finished) return;
      finished = true;
      clearTimeout(loadTimer);
      unsubscribers.forEach(unsub => unsub());
      resolve({ earned, failed });
    };

    unsubscribers.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(loadTimer);
        ad.show().catch(() => finish(true));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => finish(false)),
      ad.addAdEventListener(AdEventType.ERROR, () => finish(true)),
    );

    loadTimer = setTimeout(() => finish(true), AD_LOAD_TIMEOUT_MS);
    ad.load();
  });

// Convenience: show the ad and grant the unlock if the user earned it.
export const watchAdToUnlock = async () => {
  const result = await showRewardedAd();
  if (result.earned) await grantUnlock();
  return result;
};
