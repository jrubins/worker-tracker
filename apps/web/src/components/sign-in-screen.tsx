import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from './logo';

interface SignInScreenProps {
  /** 'authkit': one button that redirects to WorkOS. 'dev': sign in as any user ID. */
  provider: 'authkit' | 'dev';
  onSignIn: (userId?: string) => Promise<void>;
}

export function SignInScreen({ provider, onSignIn }: SignInScreenProps) {
  const [userId, setUserId] = useState('dev-user');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSignIn(provider === 'dev' ? userId : undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed');
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Sign in</h1>
          </CardTitle>
          <CardDescription>
            {provider === 'dev'
              ? 'Development sign-in: no account needed, data is kept per user ID.'
              : 'Continue to sign in with your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            {provider === 'dev' ? (
              <div className="space-y-1">
                <Label htmlFor="dev-user-id">User ID</Label>
                <Input
                  id="dev-user-id"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                />
              </div>
            ) : null}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
