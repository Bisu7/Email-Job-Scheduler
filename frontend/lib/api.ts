import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  verify: async (token: string, userInfo: any) => {
    const response = await api.post('/auth/verify', { token, userInfo })
    return response.data
  },
  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// Email API
export const emailAPI = {
  schedule: async (data: {
    recipientEmails: string[]
    subject: string
    body: string
    startTime: string
    delayBetweenEmails: number
    hourlyLimit: number
    senderEmail: string
  }) => {
    const response = await api.post('/emails/schedule', data)
    return response.data
  },
  getScheduled: async () => {
    const response = await api.get('/emails/scheduled')
    return response.data
  },
  getSent: async () => {
    const response = await api.get('/emails/sent')
    return response.data
  },
  getStats: async () => {
    const response = await api.get('/emails/stats')
    return response.data
  },
}

