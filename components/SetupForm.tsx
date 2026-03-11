'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useSession } from '@/store/sessionStore';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';
import { trimResume, trimJobDescription } from '@/lib/trimContext';
import { useRouter } from 'next/navigation';

export default function SetupForm() {
  const router = useRouter();
  const { setSession, addWarning } = useSession();

  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [pdfError, setPdfError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setPdfError('Please upload a PDF file.');
      return;
    }

    setPdfError('');
    setLoadingText('Parsing PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Read the file as array buffer and convert to text using a simple approach
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Send to a simple parse endpoint or parse client-side
      // For simplicity, we'll extract text on client side using basic approach
      // and fall back to server-side if needed
      const text = await extractTextFromPdf(uint8Array);
      if (text && text.trim().length > 0) {
        setResumeText(text);
      } else {
        setPdfError('PDF parsing failed. Please paste your resume as text instead.');
      }
    } catch {
      setPdfError('PDF parsing failed. Please paste your resume as text instead.');
    } finally {
      setLoadingText('');
    }
  }, []);

  const extractTextFromPdf = async (data: Uint8Array): Promise<string> => {
    // Client-side extraction attempt using basic text patterns
    // For proper extraction, we decode the raw bytes to find text strings
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(data);

    // Try to find text between BT and ET markers (PDF text objects)
    const textMatches: string[] = [];
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const text = match[1];
      if (text.length > 2 && !text.match(/^[\\\/\d\s.]+$/)) {
        textMatches.push(text);
      }
    }

    if (textMatches.length > 5) {
      return textMatches.join(' ').replace(/\s+/g, ' ').trim();
    }

    // Fallback: just extract readable ASCII content
    const readable = raw
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Take only meaningful looking text blocks
    const words = readable.split(' ').filter(w => w.length > 1);
    if (words.length > 20) {
      return words.join(' ');
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumeText.trim() || !jobDescription.trim() || !roleTitle.trim() || !companyName.trim()) {
      return;
    }

    setIsLoading(true);
    setLoadingText('Researching company...');

    try {
      // Step 1: Research company
      let companyResearch = '';
      try {
        const researchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: companyName.trim() }),
        });

        if (researchRes.ok) {
          const data = await researchRes.json();
          companyResearch = data.summary || '';
        }
      } catch {
        companyResearch = 'Company research unavailable.';
        addWarning('Company research unavailable.');
      }

      // Step 2: Trim context
      setLoadingText('Preparing interview context...');

      const trimmedResume = trimResume(resumeText.trim());
      const trimmedJD = trimJobDescription(jobDescription.trim());

      if (trimmedResume.wasTrimmed) {
        addWarning('Resume trimmed to fit context window.');
      }
      if (trimmedJD.wasTrimmed) {
        addWarning('Job description trimmed to fit context window.');
      }

      // Step 3: Build system prompt and store session
      const sessionCtx = {
        resumeText: trimmedResume.text,
        jobDescription: trimmedJD.text,
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim(),
        companyResearch,
        systemPrompt: '',
      };

      sessionCtx.systemPrompt = buildSystemPrompt(sessionCtx);
      setSession(sessionCtx);

      // Step 4: Navigate to interview
      router.push('/interview');
    } catch {
      setLoadingText('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
      {/* Resume */}
      <div>
        <label htmlFor="resume" className="block text-sm font-medium text-slate-300 mb-2">
          Your Resume
        </label>
        <textarea
          id="resume"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here..."
          className="w-full h-48 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-150"
          required
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-150 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload PDF instead
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
            {pdfError && (
              <span className="text-sm text-red-400">{pdfError}</span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {resumeText.length.toLocaleString()} characters
          </span>
        </div>
      </div>

      {/* Job Description */}
      <div>
        <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-300 mb-2">
          Job Description
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full h-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-150"
          required
        />
      </div>

      {/* Role Title */}
      <div>
        <label htmlFor="roleTitle" className="block text-sm font-medium text-slate-300 mb-2">
          Role Title
        </label>
        <input
          id="roleTitle"
          type="text"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="e.g. Senior Product Manager"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
          required
        />
      </div>

      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-2">
          Company Name
        </label>
        <input
          id="companyName"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Stripe"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
          required
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !resumeText.trim() || !jobDescription.trim() || !roleTitle.trim() || !companyName.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-150 text-lg flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {loadingText}
          </>
        ) : (
          <>
            Start Interview
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
