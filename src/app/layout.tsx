import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeshNative - Parametric Mesh Editor',
  description: 'A parametric 3D mesh editor with DSL-based modeling',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
