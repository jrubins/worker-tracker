import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/session';

interface UserMenuProps {
  user: SessionUser;
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span
        className="text-muted-foreground max-w-48 truncate"
        title={user.email ?? user.name ?? user.id}
      >
        {user.email ?? user.name ?? user.id}
      </span>
      <Button variant="outline" size="sm" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
