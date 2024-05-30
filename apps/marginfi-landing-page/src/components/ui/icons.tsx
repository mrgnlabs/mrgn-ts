export type IconProps = {
  size?: number;
  className?: string;
};

export const IconMoneyBill = ({ size = 28, className }: IconProps) => (
  <svg width="28" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M27.5 5C25.0146 5 23 2.98527 23 0.5M0.5 5C2.98527 5 5 2.98527 5 0.5M27.5 11C25.0146 11 23 13.0146 23 15.5M0.5 11C2.98527 11 5 13.0146 5 15.5M3.5 0.5H24.5C26.1569 0.5 27.5 1.84314 27.5 3.5V12.5C27.5 14.1569 26.1569 15.5 24.5 15.5H3.5C1.84314 15.5 0.5 14.1569 0.5 12.5V3.5C0.5 1.84314 1.84314 0.5 3.5 0.5ZM17 8C17 9.6569 15.6569 11 14 11C12.3431 11 11 9.6569 11 8C11 6.3431 12.3431 5 14 5C15.6569 5 17 6.3431 17 8Z"
      stroke="white"
      strokeLinecap="round"
    />
  </svg>
);

export const IconCode = ({ size = 28, className }: IconProps) => (
  <svg width={size} className={className} viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.74978 5L1.81017 9.94205C1.22453 10.5279 1.22477 11.4778 1.8107 12.0634L6.74978 17M23.2499 5L28.1894 9.94205C28.775 10.5279 28.7748 11.4778 28.1889 12.0634L23.2499 17M19.5 0.5L10.5 21.5"
      stroke="white"
      strokeLinecap="round"
    />
  </svg>
);

export const IconBrandSubstack = ({ size = 28, className }: IconProps) => (
  <svg height={size} className={className} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_31_8)">
      <path d="M22.9991 6.181H2V8.89931H22.9991V6.181Z" fill="currentColor" />
      <path d="M2 11.362V24.0004L12.4991 18.3561L23 24.0004V11.362H2Z" fill="currentColor" />
      <path d="M22.9991 1H2V3.71786H22.9991V1Z" fill="currentColor" />
    </g>
    <defs>
      <clipPath id="clip0_31_8">
        <rect width="21" height="23" fill="white" transform="translate(2 1)" />
      </clipPath>
    </defs>
  </svg>
);
