'use client';

import SetupForm from '@/components/SetupForm';
import Link from 'next/link';

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-400 text-sm font-medium">AI Interview Assistant</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Interview<span className="text-blue-500">AI</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Paste your resume and job details. Get personalized answers to any interview question.
          </p>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-400 transition-colors duration-150 mt-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            View Past Sessions
          </Link>
        </div>

        {/* Form */}
        <SetupForm />

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-xs mt-8">
          Sessions are saved so you can resume on any device.
        </p>
      </div>
    </main>
  );
}
