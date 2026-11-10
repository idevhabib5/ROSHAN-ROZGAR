import { AuthForm } from '@/components/AuthForm'
import { authProvidersAvailable } from '@/auth'

export default function SignupPage() {
  const providers = authProvidersAvailable()
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">RR</span>
          <div>
            <strong>Roshan Rozgar</strong>
            <p>Create an account, then a short role form and Roshan Assistant.</p>
          </div>
        </div>
        <AuthForm mode="signup" initialProviders={providers} />
      </div>
    </div>
  )
}
