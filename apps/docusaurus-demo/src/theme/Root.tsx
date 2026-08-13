import type { PropsWithChildren } from 'react';
import OriginalRoot from '@theme-original/Root';
import { Analytics } from '@vercel/analytics/react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <OriginalRoot>
      {children}
      <Analytics />
    </OriginalRoot>
  );
}
