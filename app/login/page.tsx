import { AuthForm } from '@/components/AuthForm'

export default function LoginPage() {
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">RR</span>
          <div>
            <strong>Roshan Rozgar</strong>
            <p>Log in to continue as a worker or customer.</p>
          </div>
        </div>
        <AuthForm mode="login" />
      </div>
    </div>
  )
}
