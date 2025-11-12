import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationSettings {
  notifications_enabled: boolean;
  morning_time: string;
  afternoon_time: string;
  evening_time: string;
  timezone: string;
  activity_reminders: boolean;
  test_reminders: boolean;
  milestone_celebrations: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    notifications_enabled: true,
    morning_time: '08:00:00',
    afternoon_time: '14:00:00',
    evening_time: '19:00:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    activity_reminders: true,
    test_reminders: true,
    milestone_celebrations: true,
  });

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifications enabled successfully!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
    return false;
  };

  const subscribeToNotifications = async (planStartDate: string) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('health_plan_notifications')
        .upsert({
          user_id: user.id,
          plan_start_date: planStartDate,
          push_subscription: subscription.toJSON() as any,
          notifications_enabled: settings.notifications_enabled,
          morning_time: settings.morning_time,
          afternoon_time: settings.afternoon_time,
          evening_time: settings.evening_time,
          timezone: settings.timezone,
          activity_reminders: settings.activity_reminders,
          test_reminders: settings.test_reminders,
          milestone_celebrations: settings.milestone_celebrations,
        });

      if (error) throw error;

      toast.success('Push notifications enabled!');
      return true;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  };

  const updateSettings = async (planStartDate: string, newSettings: Partial<NotificationSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('health_plan_notifications')
        .update(updatedSettings)
        .eq('user_id', user.id)
        .eq('plan_start_date', planStartDate);

      if (error) throw error;

      toast.success('Notification settings updated');
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update settings');
      return false;
    }
  };

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Daigassist!',
        icon: '/daigassist-logo.png',
        badge: '/daigassist-logo.png',
      });
    } else {
      toast.error('Please enable notifications first');
    }
  };

  return {
    permission,
    isSupported,
    settings,
    requestPermission,
    subscribeToNotifications,
    updateSettings,
    sendTestNotification,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}