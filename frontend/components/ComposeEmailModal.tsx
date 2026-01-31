'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { emailAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import Papa from 'papaparse'

interface ComposeEmailModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ComposeEmailModal({ isOpen, onClose }: ComposeEmailModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [startTime, setStartTime] = useState('')
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2000)
  const [hourlyLimit, setHourlyLimit] = useState(200)
  const [senderEmail, setSenderEmail] = useState('noreply@example.com')
  const [recipientEmails, setRecipientEmails] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  if (!isOpen) return null

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (results) => {
        const emails: string[] = []
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === 'string' && cell.includes('@')) {
                // Simple email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (emailRegex.test(cell.trim())) {
                  emails.push(cell.trim())
                }
              }
            })
          } else if (typeof row === 'object') {
            // Handle object rows (CSV with headers)
            Object.values(row).forEach((value: any) => {
              if (typeof value === 'string' && value.includes('@')) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (emailRegex.test(value.trim())) {
                  emails.push(value.trim())
                }
              }
            })
          }
        })

        // Remove duplicates
        const uniqueEmails = Array.from(new Set(emails))
        setRecipientEmails(uniqueEmails)
        toast.success(`Found ${uniqueEmails.length} email addresses`)
      },
      error: (error) => {
        toast.error('Error parsing CSV file')
        console.error('CSV parse error:', error)
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject || !body) {
      toast.error('Please fill in subject and body')
      return
    }

    if (recipientEmails.length === 0) {
      toast.error('Please upload a CSV file with email addresses')
      return
    }

    if (!startTime) {
      toast.error('Please select a start time')
      return
    }

    setIsSubmitting(true)

    try {
      await emailAPI.schedule({
        recipientEmails,
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
        senderEmail,
      })

      toast.success(`Scheduled ${recipientEmails.length} emails`)
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] })
      
      // Reset form
      setSubject('')
      setBody('')
      setStartTime('')
      setRecipientEmails([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule emails')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Compose New Email
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Email subject"
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Email body (HTML supported)"
                required
              />
            </div>

            {/* CSV Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Email Leads (CSV)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {recipientEmails.length > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  {recipientEmails.length} email addresses detected
                </p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Delay Between Emails */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delay Between Emails (ms)
              </label>
              <input
                type="number"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value))}
                min={1000}
                step={1000}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Hourly Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Limit
              </label>
              <input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value))}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Sender Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sender Email
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

