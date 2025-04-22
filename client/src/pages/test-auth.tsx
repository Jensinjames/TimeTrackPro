import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Link } from 'wouter';

export default function TestAuthPage() {
  const { user, loginMutation } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await loginMutation.mutateAsync({ username, password });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Test Authentication</CardTitle>
        </CardHeader>
        
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 text-green-700 rounded-md">
                <p className="font-medium">Logged in successfully!</p>
                <p>Username: {user.username}</p>
                <p>User ID: {user.id}</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium">
                  Username
                </label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Logging in...' : 'Login'}
              </Button>
              
              <div className="text-center text-sm text-gray-500">
                <p>Default credentials:</p>
                <p>Username: jensin</p>
                <p>Password: password</p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}