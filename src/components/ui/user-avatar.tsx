import { useMemo } from 'react';

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function UserAvatar({ src, name, email, size = 'md', className = '' }: UserAvatarProps) {
  const initials = useMemo(() => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  }, [name, email]);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const bgColors = [
    'bg-brand-500',
    'bg-emerald-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
  ];

  const bgColor = useMemo(() => {
    const hash = (name || email || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return bgColors[hash % bgColors.length];
  }, [name, email]);

  if (src) {
    return (
      <img
        src={src}
        alt={name || email || 'User'}
        className={`${sizeClasses[size]} rounded-2xl object-cover shadow-sm ${className}`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).parentElement?.classList.add(bgColor);
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} flex items-center justify-center rounded-2xl font-bold text-white shadow-sm ${className}`}
    >
      {initials}
    </div>
  );
}
