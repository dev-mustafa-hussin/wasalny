import { Bell, BellOff, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationToggleProps {
  compact?: boolean;
}

export function PushNotificationToggle({ compact = false }: PushNotificationToggleProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendLocalNotification
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const testNotification = () => {
    sendLocalNotification(
      'تجربة الإشعارات',
      'هذا إشعار تجريبي من تطبيق وصلني!',
      { url: '/my-orders' }
    );
  };

  if (!isSupported) {
    if (compact) return null;
    
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">متصفحك لا يدعم إشعارات Push</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">إشعارات Push</span>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          إشعارات Push
        </CardTitle>
        <CardDescription>
          تلقي إشعارات فورية على جهازك عند تحديث حالة طلبك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-600">الإشعارات مفعّلة</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">الإشعارات غير مفعّلة</span>
              </>
            )}
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {permission === 'denied' && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>تم حظر الإشعارات. يرجى تفعيلها من إعدادات المتصفح</span>
          </div>
        )}

        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={testNotification}
            className="w-full"
          >
            إرسال إشعار تجريبي
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جاري التحميل...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
