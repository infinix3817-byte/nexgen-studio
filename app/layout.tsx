import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexGen Studio — AI creation, reimagined',
  description: 'Create stunning AI images and videos with NexGen Studio.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
