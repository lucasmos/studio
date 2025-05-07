import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="120"
      height="30"
      aria-label="DerivAI Lite Logo"
      {...props}
    >
      <rect width="200" height="50" rx="5" fill="currentColor" />
      <text
        x="10"
        y="35"
        fontFamily="var(--font-geist-sans), Arial, sans-serif"
        fontSize="28"
        fill="hsl(var(--primary-foreground))"
        fontWeight="bold"
      >
        DerivAI
      </text>
      <text
        x="125"
        y="35"
        fontFamily="var(--font-geist-sans), Arial, sans-serif"
        fontSize="28"
        fill="hsl(var(--accent))"
        fontWeight="normal"
      >
        Lite
      </text>
    </svg>
  );
}
