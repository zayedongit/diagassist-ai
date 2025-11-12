import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationSettingsPanelProps {
  planStartDate: string;
}

export const NotificationSettingsPanel = ({ planStartDate }: NotificationSettingsPanelProps) => {
  const {
    permission,
    isSupported,
    settings,
    requestPermission,
    subscribeToNotifications,
    updateSettings,
    sendTestNotification,
  } = useNotifications();

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggleNotifications = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (granted) {
        await subscribeToNotifications(planStartDate);
      }
    } else {
      const newEnabled = !localSettings.notifications_enabled;
      setLocalSettings({ ...localSettings, notifications_enabled: newEnabled });
      await updateSettings(planStartDate, { notifications_enabled: newEnabled });
    }
  };

  const handleUpdateSettings = async () => {
    await updateSettings(planStartDate, localSettings);
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <BellOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Notifications are not supported in this browser</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Get reminders to stay on track with your health plan
              </p>
            </div>
          </div>
          <Switch
            checked={permission === 'granted' && localSettings.notifications_enabled}
            onCheckedChange={handleToggleNotifications}
          />
        </div>

        {permission === 'granted' && localSettings.notifications_enabled && (
          <>
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Notification Times</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="morning" className="text-xs text-muted-foreground">
                      Morning
                    </Label>
                    <Input
                      id="morning"
                      type="time"
                      value={localSettings.morning_time.slice(0, 5)}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          morning_time: e.target.value + ':00',
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="afternoon" className="text-xs text-muted-foreground">
                      Afternoon
                    </Label>
                    <Input
                      id="afternoon"
                      type="time"
                      value={localSettings.afternoon_time.slice(0, 5)}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          afternoon_time: e.target.value + ':00',
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="evening" className="text-xs text-muted-foreground">
                      Evening
                    </Label>
                    <Input
                      id="evening"
                      type="time"
                      value={localSettings.evening_time.slice(0, 5)}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          evening_time: e.target.value + ':00',
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Notification Types</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="activity-reminders" className="font-normal">
                      Daily Activity Reminders
                    </Label>
                    <Switch
                      id="activity-reminders"
                      checked={localSettings.activity_reminders}
                      onCheckedChange={(checked) =>
                        setLocalSettings({ ...localSettings, activity_reminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="test-reminders" className="font-normal">
                      Test & Appointment Reminders
                    </Label>
                    <Switch
                      id="test-reminders"
                      checked={localSettings.test_reminders}
                      onCheckedChange={(checked) =>
                        setLocalSettings({ ...localSettings, test_reminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="milestone-celebrations" className="font-normal">
                      Milestone Celebrations
                    </Label>
                    <Switch
                      id="milestone-celebrations"
                      checked={localSettings.milestone_celebrations}
                      onCheckedChange={(checked) =>
                        setLocalSettings({ ...localSettings, milestone_celebrations: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateSettings} className="flex-1">
                  Save Settings
                </Button>
                <Button variant="outline" onClick={sendTestNotification}>
                  Test
                </Button>
              </div>
            </div>
          </>
        )}

        {permission === 'denied' && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Notifications are blocked. Please enable them in your browser settings to receive
              reminders.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};