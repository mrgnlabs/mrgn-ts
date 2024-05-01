import {
  DialectNotification,
  DialectSdkNotification,
  NotificationSink,
  ResourceId,
} from '@dialectlabs/monitor';

export class StdoutNotificationSink
  implements NotificationSink<DialectSdkNotification>
{
  async push(
    notification: DialectNotification,
    recipients: ResourceId[],
  ): Promise<void> {
    // In this case, notifications sent to the console log
    console.log(
      `[Mock] Sending new notification:
  ${JSON.stringify(notification)}
  recipients: ${recipients}`,
    );
  }
}
