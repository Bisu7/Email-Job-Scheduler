'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardHeader } from '@/components/DashboardHeader'
import { ScheduledEmails } from '@/components/ScheduledEmails'
import { SentEmails } from '@/components/SentEmails'
import { ComposeEmailModal } from '@/components/ComposeEmailModal'

type Tab = 'scheduled' | 'sent'

export default function DashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('scheduled')
  const [isComposeOpen, setIsComposeOpen] = useState(false)

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'scheduled'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Scheduled Emails
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sent Emails
              </button>
            </nav>
          </div>
        </div>

        {/* Compose Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            Compose New Email
          </button>
        </div>

        {/* Content */}
        {activeTab === 'scheduled' ? <ScheduledEmails /> : <SentEmails />}
      </main>

      {/* Compose Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  )
}

