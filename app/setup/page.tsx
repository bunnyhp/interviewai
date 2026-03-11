'use client';

import SetupForm from '@/components/SetupForm';

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
        </div>

        {/* Form */}
        <SetupForm />

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-xs mt-8">
          Your data stays in your browser. Nothing is stored on any server.
        </p>
      </div>
    </main>
  );
}
