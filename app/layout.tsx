import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/store/sessionStore';

export const metadata: Metadata = {
  title: 'InterviewAI — Your Personal AI Interview Assistant',
  description:
    'Get personalized, context-aware interview answers in real-time. Paste your resume, add the job description, and start practicing with AI-powered responses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f172a] text-white antialiased min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
