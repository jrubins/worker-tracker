import { Check, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SessionUser } from '@/lib/session';
import type { ThemePreference } from '@/lib/theme';

interface UserMenuProps {
  user: SessionUser;
  onSignOut: () => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  /** Show the user's name next to the avatar (sidebar), or the avatar alone (phone header). */
  showName?: boolean;
}

const themes = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const displayName = (user: SessionUser) => user.name ?? user.email ?? user.id;

function initials(user: SessionUser) {
  const words = displayName(user)
    .split(/[\s@._-]+/)
    .filter(Boolean);
  return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

/** Account menu: who is signed in, the theme, and sign out. */
export function UserMenu({ user, onSignOut, theme, onThemeChange, showName }: UserMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="hover:bg-accent focus-visible:ring-ring flex max-w-full min-w-0 items-center gap-2.5 rounded-lg p-1.5 text-left outline-none focus-visible:ring-2">
        <span className="sr-only">Account menu</span>
        <Avatar className="size-8 shrink-0" aria-hidden>
          <AvatarFallback className="bg-secondary text-xs font-semibold">
            {initials(user)}
          </AvatarFallback>
        </Avatar>
        {showName ? (
          <span className="min-w-0 truncate text-sm font-medium">{displayName(user)}</span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{displayName(user)}</span>
          {user.email && user.email !== displayName(user) ? (
            <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="eyebrow">Theme</DropdownMenuLabel>
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => onThemeChange(value)}>
            <Icon />
            {label}
            {theme === value ? (
              <Check className="text-primary ml-auto" aria-label="(current)" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
