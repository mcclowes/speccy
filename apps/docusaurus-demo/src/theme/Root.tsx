import type { PropsWithChildren } from 'react';
import { Analytics } from '@vercel/analytics/react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
