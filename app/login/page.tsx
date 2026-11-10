import { AuthForm } from '@/components/AuthForm'
import { authProvidersAvailable } from '@/auth'

export default function LoginPage() {
  const providers = authProvidersAvailable()
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">RR</span>
          <div>
            <strong>Roshan Rozgar</strong>
            <p>Log in, then a short setup form — Roshan Assistant helps next.</p>
          </div>
        </div>
        <AuthForm mode="login" initialProviders={providers} />
      </div>
    </div>
  )
}
