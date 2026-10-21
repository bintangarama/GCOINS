import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M 214 195 A 86 86 0 1 0 214 317 L 214 256 L 148 256"
                fill="none"
                stroke="currentColor"
                strokeWidth="54"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M 442 195 A 86 86 0 1 0 442 317"
                fill="none"
                stroke="currentColor"
                strokeWidth="54"
                strokeLinecap="round"
            />
            <circle cx="366" cy="256" r="26" fill="#F59E0B" />
            <circle cx="366" cy="256" r="20" fill="none" stroke="#FEF08A" strokeWidth="3" opacity="0.9" />
        </svg>
    );
}
