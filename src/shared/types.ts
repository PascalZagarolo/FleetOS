export type WindowBounds = {
  width: number;
  height: number;
  x?: number;
  y?: number;
};

export type AppInfo = {
  version: string;
  electronVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  isPackaged: boolean;
};

export type Platform = 'darwin' | 'win32' | 'linux';

export type OpenExternalResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateInfo = {
  version: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string | null;
};

export type ProgressInfo = {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
};

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; info: UpdateInfo }
  | { status: 'not-available' }
  | { status: 'downloading'; progress: ProgressInfo }
  | { status: 'downloaded'; info: UpdateInfo }
  | { status: 'error'; error: string };

export type TrayData = {
  todayHandovers: number;
  nextHandover: {
    vehicle: string;
    time: string;
    customerName: string;
  } | null;
  openBookings: number;
  pendingTasks: number;
  notificationsUnread: number;
};

export type ShortcutDefinition = {
  id: string;
  accelerator: string;
  defaultAccelerator: string;
  description: string;
};

export type TrayNotification = {
  title: string;
  body: string;
  urgent?: boolean;
  navigateTo?: string;
};

export type NotificationActionButton = {
  type: 'button';
  text: string;
  action: string;
};

export type RichNotificationOptions = {
  id?: string;
  title: string;
  body: string;
  subtitle?: string;
  icon?: string;
  silent?: boolean;
  urgent?: boolean;
  tag?: string;
  category?: string;
  navigateTo?: string;
  actions?: NotificationActionButton[];
  hasReply?: boolean;
  replyPlaceholder?: string;
  data?: Record<string, unknown>;
};

export type NotificationPermissionState =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type DndSettings = {
  enabled: boolean;
  from?: string; // "HH:MM"
  to?: string;
};

export type NotificationClickPayload = {
  id?: string;
  data?: Record<string, unknown>;
};

export type NotificationActionPayload = {
  id?: string;
  action: string;
  data?: Record<string, unknown>;
};

export type NotificationReplyPayload = {
  id?: string;
  reply: string;
  data?: Record<string, unknown>;
};

export type DeepLinkPayload = {
  url: string;
  route: string;
  params: Record<string, string>;
};
