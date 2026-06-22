import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useNotifications, useMarkNotificationRead } from '@/hooks/use-notifications';

type NotificationBellProps = {
  userId: string;
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: notifications } = useNotifications(userId);
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl p-0 text-gray-600 transition hover:bg-orange-100 dark:text-orange-500 dark:hover:bg-orange-500/20"
        aria-label={t('notifications')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-3xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('notifications')}
          </p>
          {!notifications || notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('noNotifications')}
            </p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`relative rounded-2xl px-3 py-2.5 transition ${
                    !notification.is_read
                      ? 'bg-brand-50 dark:bg-brand-900/20'
                      : 'hover:bg-stone-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      className="block"
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {notification.body}
                      </p>
                    </Link>
                  ) : (
                    <div onClick={() => handleMarkRead(notification.id)}>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {notification.body}
                      </p>
                    </div>
                  )}
                  {!notification.is_read && (
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
