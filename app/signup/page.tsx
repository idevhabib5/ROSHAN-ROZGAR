import { AuthForm } from '@/components/AuthForm'

export default function SignupPage() {
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">RR</span>
          <div>
            <strong>Roshan Rozgar</strong>
            <p>Create an account, then choose worker or customer.</p>
          </div>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}
