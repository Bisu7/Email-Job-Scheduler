'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    google: any
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { user, login } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
      return
    }

    // Load Google Sign-In script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          callback: handleCredentialResponse,
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: 300,
          }
        )
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [user, router])

  const handleCredentialResponse = async (response: any) => {
    try {
      // Decode JWT token (simple decode, not verification)
      const base64Url = response.credential.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const userInfo = JSON.parse(jsonPayload)

      // Verify with backend
      const result = await authAPI.verify(response.credential, userInfo)
      login(result.token, result.user)
      toast.success('Logged in successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Email Job Scheduler
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Sign in to continue
        </p>
        <div className="flex justify-center">
          <div id="google-signin-button"></div>
        </div>
        {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <p className="mt-4 text-sm text-red-600 text-center">
            Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env file
          </p>
        )}
      </div>
    </div>
  )
}

