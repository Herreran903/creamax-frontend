'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mock: persist simple flag; en real usar NextAuth
    localStorage.setItem('creamax_auth', JSON.stringify({ email }));
    r.push('/app');
  };

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-sm bg-white/10 backdrop-blur border-white/20 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">CRAMX</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" form="login-form" className="w-full">
            Ingresar
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
