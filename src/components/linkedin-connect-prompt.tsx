"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Linkedin,
  Loader2,
  LinkIcon,
  CheckCircle,
  Mail,
  Lock,
  KeyRound,
  ArrowLeft,
  Smartphone,
  ShieldQuestion,
  Building2,
} from "lucide-react"

type Step =
  | "choose"
  | "credentials"
  | "checkpoint"
  | "in_app_validation"
  | "captcha"
  | "contract_chooser"
  | "success"

type ContractOption = { id: string; name: string }

export function LinkedinConnectPrompt() {
  const [connecting, setConnecting] = useState(false)

  const [step, setStep] = useState<Step>("choose")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [accountId, setAccountId] = useState("")
  const [checkpointType, setCheckpointType] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // CAPTCHA state
  const [captchaPublicKey, setCaptchaPublicKey] = useState("")
  const [captchaData, setCaptchaData] = useState("")
  const [captchaToken, setCaptchaToken] = useState("")
  const captchaContainerRef = useRef<HTMLDivElement>(null)

  // CONTRACT_CHOOSER state
  const [contractOptions, setContractOptions] = useState<ContractOption[]>([])
  const [selectedContract, setSelectedContract] = useState("")

  // Route checkpoint response to the right step
  const handleCheckpoint = useCallback((data: {
    account_id: string
    checkpoint: {
      type: string
      public_key?: string
      data?: string
      contract_options?: ContractOption[]
      source?: string
    }
  }) => {
    setAccountId(data.account_id)
    const cpType = data.checkpoint.type
    setCheckpointType(cpType)

    switch (cpType) {
      case '2FA':
      case 'OTP':
      case 'PHONE_REGISTER':
        setStep('checkpoint')
        break
      case 'IN_APP_VALIDATION':
        setStep('in_app_validation')
        break
      case 'CAPTCHA':
        setCaptchaPublicKey(data.checkpoint.public_key || '')
        setCaptchaData(data.checkpoint.data || '')
        setCaptchaToken('')
        setStep('captcha')
        break
      case 'CONTRACT_CHOOSER':
        setContractOptions(data.checkpoint.contract_options || [])
        setSelectedContract('')
        setStep('contract_chooser')
        break
      default:
        setError(`Unknown verification type: ${cpType}.`)
    }
  }, [])

  // Existing hosted auth handler
  const handleConnect = async () => {
    setConnecting(true)

    try {
      const response = await fetch('/api/auth/unipile/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Failed to get auth link:', data.error)
        alert('Failed to connect to LinkedIn. Please try again.')
      }
    } catch (error) {
      console.error('Failed to get auth link:', error)
      alert('Failed to connect to LinkedIn. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  // Handle credential submission
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/unipile/connect-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to connect')
        return
      }

      if (data.object === 'AccountCreated' || data.object === 'AccountReconnected') {
        setAccountId(data.account_id)
        await saveSession(data.account_id)
      } else if (data.object === 'Checkpoint') {
        handleCheckpoint(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Submit checkpoint code (used by 2FA, OTP, PHONE_REGISTER, CAPTCHA, CONTRACT_CHOOSER)
  const submitCheckpointCode = async (code: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/unipile/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Verification failed')
        return
      }

      if (data.object === 'AccountCreated' || data.object === 'AccountReconnected') {
        await saveSession(data.account_id)
      } else if (data.object === 'Checkpoint') {
        handleCheckpoint(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle verification code form submission
  const handleCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitCheckpointCode(verificationCode)
  }

  // Handle contract selection
  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContract) {
      setError('Please select a contract.')
      return
    }
    await submitCheckpointCode(selectedContract)
  }

  // Handle captcha token submission
  const handleCaptchaSubmit = async () => {
    if (!captchaToken) {
      setError('Please complete the captcha.')
      return
    }
    await submitCheckpointCode(captchaToken)
  }

  // Save session and redirect
  const saveSession = async (accId: string) => {
    setStep('success')
    try {
      const response = await fetch('/api/auth/unipile/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accId }),
      })
      if (response.ok) {
        window.location.href = '/dashboard'
      } else {
        setError('Connected but failed to save session. Please refresh.')
        setStep('credentials')
      }
    } catch {
      setError('Connected but failed to save session. Please refresh.')
      setStep('credentials')
    }
  }

  // Load FunCaptcha (Arkose Labs) widget
  useEffect(() => {
    if (step !== 'captcha' || !captchaPublicKey) return

    const callbackName = `__arkose_callback_${Date.now()}`

    // Set up global callback for when captcha is solved
    ;(window as Record<string, unknown>)[callbackName] = (token: string) => {
      setCaptchaToken(token)
    }

    const script = document.createElement('script')
    script.src = `https://client-api.arkoselabs.com/v2/${captchaPublicKey}/api.js`
    script.setAttribute('data-callback', callbackName)
    script.async = true
    script.defer = true

    if (captchaData) {
      script.setAttribute('data-blob', captchaData)
    }

    const container = captchaContainerRef.current
    container?.appendChild(script)

    return () => {
      delete (window as Record<string, unknown>)[callbackName]
      if (container?.contains(script)) {
        container.removeChild(script)
      }
    }
  }, [step, captchaPublicKey, captchaData])

  const getSubtitle = () => {
    switch (step) {
      case 'choose':
        return 'Connect your LinkedIn account to search through your connections and send personalized messages.'
      case 'credentials':
        return 'Enter your LinkedIn credentials to connect your account.'
      case 'checkpoint':
        if (checkpointType === '2FA')
          return 'Enter the 2FA code from your authenticator app.'
        if (checkpointType === 'PHONE_REGISTER')
          return 'LinkedIn requires phone verification. Enter the code sent to your phone.'
        return 'Enter the verification code sent to your email or phone.'
      case 'in_app_validation':
        return 'Check your LinkedIn mobile app to approve the sign-in request.'
      case 'captcha':
        return 'Complete the security challenge to continue.'
      case 'contract_chooser':
        return 'Select which LinkedIn contract to use with this account.'
      case 'success':
        return 'Successfully connected! Redirecting...'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
        <Linkedin className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Connect Your LinkedIn</h1>
        <p className="text-muted-foreground max-w-md">
          {getSubtitle()}
        </p>
      </div>

      {/* Step: choose */}
      {step === 'choose' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={connecting}
              className="h-12 px-8"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="w-5 h-5 mr-2" />
              )}
              {connecting ? 'Connecting...' : 'Connect LinkedIn Account'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setStep('credentials')}
              className="h-12 px-8"
            >
              <KeyRound className="w-5 h-5 mr-2" />
              Connect with Credentials
            </Button>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-8">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Secure connection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Read-only access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Disconnect anytime</span>
            </div>
          </div>
        </>
      )}

      {/* Step: credentials form */}
      {step === 'credentials' && (
        <form onSubmit={handleCredentialSubmit} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="li-username" className="text-sm font-medium">
              LinkedIn Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="li-username"
                type="email"
                placeholder="you@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="pl-11 h-12 text-base border-border-strong focus:border-primary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="li-password" className="text-sm font-medium">
              LinkedIn Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="li-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-11 h-12 text-base border-border-strong focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setStep('choose'); setError('') }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your credentials are sent directly to LinkedIn via Unipile and are never stored.
          </p>
        </form>
      )}

      {/* Step: checkpoint (2FA/OTP/PHONE_REGISTER) */}
      {step === 'checkpoint' && (
        <form onSubmit={handleCheckpointSubmit} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="li-code" className="text-sm font-medium">
              Verification Code
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="li-code"
                type="text"
                inputMode="numeric"
                placeholder="Enter code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                autoFocus
                className="pl-11 h-12 text-base text-center tracking-widest border-border-strong focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setStep('credentials'); setError(''); setVerificationCode('') }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      )}

      {/* Step: in_app_validation */}
      {step === 'in_app_validation' && (
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Open the LinkedIn app on your phone and approve the sign-in request.
            Once approved, click the button below.
          </p>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <Button
            onClick={() => saveSession(accountId)}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Checking...' : "I've Approved It"}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setStep('choose'); setError('') }}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Step: captcha */}
      {step === 'captcha' && (
        <div className="w-full max-w-sm space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldQuestion className="w-8 h-8 text-primary" />
          </div>

          {/* Arkose Labs FunCaptcha renders here */}
          <div
            ref={captchaContainerRef}
            id="captcha-container"
            className="flex justify-center min-h-[120px] items-center"
          />

          {captchaToken && (
            <div className="flex items-center gap-2 justify-center text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Captcha completed</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setStep('credentials'); setError(''); setCaptchaToken('') }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleCaptchaSubmit}
              disabled={loading || !captchaToken}
              className="flex-1"
            >
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
          </div>
        </div>
      )}

      {/* Step: contract_chooser */}
      {step === 'contract_chooser' && (
        <form onSubmit={handleContractSubmit} className="w-full max-w-sm space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            {contractOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedContract === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="contract"
                  value={option.id}
                  checked={selectedContract === option.id}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className="accent-primary"
                />
                <span className="text-sm font-medium text-foreground">{option.name}</span>
              </label>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setStep('credentials'); setError(''); setSelectedContract('') }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={loading || !selectedContract} className="flex-1">
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {loading ? 'Connecting...' : 'Continue'}
            </Button>
          </div>
        </form>
      )}

      {/* Step: success */}
      {step === 'success' && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Redirecting to dashboard...</span>
        </div>
      )}
    </div>
  )
}
