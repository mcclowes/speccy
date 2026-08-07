import type { SVGProps } from 'react';

type EyeIconProps = SVGProps<SVGSVGElement> & {
  crossed?: boolean;
};

/** Lucide's official "eye" and "eye-off" icons. */
export function EyeIcon({ crossed = false, ...props }: EyeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {crossed ? (
        <>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.73 7.6 7.7 5 12 5c4.3 0 8.27 2.6 9.94 6.65a1 1 0 0 1 0 .7C20.27 16.4 16.3 19 12 19c-4.3 0-8.27-2.6-9.94-6.65" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
