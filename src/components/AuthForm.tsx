import { useState } from 'react';
import { LogIn, UserPlus, Building2 } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { borderTokens, inputTokens, textTokens } from '../lib/design-tokens';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>;
}

export function AuthForm({ onSignIn, onSignUp }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Saisissez votre nom complet');
        }
        await onSignUp(email, password, fullName);
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message)
        : 'Une erreur est survenue';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card variant="highlight" padding="lg" className={clsx('p-5 sm:p-8', borderTokens.subtle)}>
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              HostCheckIn
            </h1>
            <p className={textTokens.muted}>
              {isSignUp ? 'Créez votre compte propriétaire' : 'Connectez-vous à votre compte'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className={clsx('block text-sm font-medium mb-1', textTokens.body)}>
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                  className={`${inputTokens.base} text-base`}
                  placeholder="Jean Dupont"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className={clsx('block text-sm font-medium mb-1', textTokens.body)}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`${inputTokens.base} text-base`}
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="password" className={clsx('block text-sm font-medium mb-1', textTokens.body)}>
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={`${inputTokens.base} text-base`}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <Card variant="danger" padding="sm" className={clsx('text-sm', textTokens.danger)}>
                {error}
              </Card>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full py-3"
            >
              {loading ? (
                'Chargement…'
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Créer un compte
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setFullName('');
              }}
              className={clsx('text-sm font-medium hover:opacity-90', textTokens.body)}
            >
              {isSignUp
                ? 'Vous avez déjà un compte ? Connectez-vous'
                : "Pas encore de compte ? Inscrivez-vous"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
