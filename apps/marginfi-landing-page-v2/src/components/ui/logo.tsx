type LogoProps = {
  size?: number;
  wordmark?: boolean;
};

export const Logo = ({ size, wordmark = true }: LogoProps) => {
  return (
    <div className="flex gap-4 text-3xl">
      <svg width={size} viewBox="0 0 36 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_1_771)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M18.5905 0.0778083C18.8763 0.0527821 19.1637 0.0276133 19.4525 0L19.4315 16.0206H19.0029C18.4639 16.0814 17.9457 16.2608 17.4866 16.5454C15.0277 18.3726 14.154 21.0608 13.2519 23.8361L13.2304 23.9023C12.4568 26.4271 10.8761 28.639 8.72314 30.2095C6.75457 31.5372 4.60633 31.7237 2.35053 31.9196C2.05391 31.9454 1.75544 31.9713 1.45526 32H0.252502V16.0103H0.880051C1.7692 15.9878 2.63865 15.7484 3.41067 15.3138C4.18268 14.8792 4.83315 14.263 5.30355 13.5202C6.3559 11.8358 7.15213 10.009 7.66692 8.09773C8.44113 5.57327 10.0263 3.3638 12.1846 1.80064C14.1537 0.466372 16.3207 0.27659 18.5905 0.0778083ZM19.4525 15.8118H35.6407V32H19.4525V15.8118Z"
            fill="#C4C6BF"
          />
        </g>
        <defs>
          <clipPath id="clip0_1_771">
            <rect width="36" height="32" fill="white" />
          </clipPath>
        </defs>
      </svg>
      marginfi
    </div>
  );
};
