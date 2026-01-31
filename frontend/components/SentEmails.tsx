'use client'

import { useQuery } from '@tanstack/react-query'
import { emailAPI } from '@/lib/api'

interface Email {
  id: string
  recipientEmail: string
  subject: string
  sentAt: string | null
  status: 'SENT' | 'FAILED'
  errorMessage?: string | null
}

export function SentEmails() {
  const { data: emails, isLoading, error } = useQuery<Email[]>({
    queryKey: ['sent-emails'],
    queryFn: emailAPI.getSent,
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading sent emails</p>
      </div>
    )
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg">No sent emails</p>
        <p className="text-gray-400 text-sm mt-2">
          Sent emails will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {email.recipientEmail}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {email.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {email.sentAt
                    ? new Date(email.sentAt).toLocaleString()
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      email.status === 'SENT'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {email.status}
                  </span>
                  {email.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">
                      {email.errorMessage}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

