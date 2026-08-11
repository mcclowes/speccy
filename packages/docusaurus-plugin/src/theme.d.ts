declare module '@theme/Layout' {
  import type { ReactNode } from 'react';

  export interface Props {
    children: ReactNode;
    title?: string;
    description?: string;
    noFooter?: boolean;
  }

  export default function Layout(props: Props): ReactNode;
}
