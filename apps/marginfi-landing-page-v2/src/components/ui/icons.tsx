import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandXFilled,
  IconMenu,
  IconNetwork,
  IconSparkles,
} from "@tabler/icons-react";

type IconProps = {
  size?: number;
  className?: string;
};

const IconMrgn = ({ size = 24, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 75 67"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M40.5038 0C40.5038 11.2992 40.5038 22.0269 40.5038 32.9584C51.9136 32.9584 63.12 32.9584 74.5 32.9584C74.5 44.3768 74.5 55.5915 74.5 67C63.1944 67 51.8342 67 40.1863 67C40.1863 56.153 40.1863 45.1967 40.1863 33.3311C38.2119 34.3348 36.6393 34.8366 35.4338 35.8006C32.1349 38.439 30.3143 42.0961 29.0493 46.0464C27.5611 50.7022 25.9439 55.2139 22.7094 59.0896C19.4651 62.9802 15.4766 65.3553 10.615 66.1354C7.33596 66.6621 3.97255 66.6373 0.5 66.8708C0.5 55.5518 0.5 44.66 0.5 33.6193C1.76996 33.346 3.03 33.1025 4.27516 32.7944C9.21113 31.5671 11.3095 27.5324 13.2244 23.448C15.3079 18.9959 16.8656 14.2755 19.1873 9.96255C22.3026 4.16887 27.6156 1.39128 34.0696 0.710546C36.0738 0.491916 38.0829 0.263349 40.5038 0Z" />
  </svg>
);

const IconSolana = ({ size = 24, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 46 46"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g clipPath="url(#clip0_1955_741)">
      <path
        d="M8.14713 31.9497C8.41266 31.6879 8.77776 31.5352 9.16498 31.5352H44.2809C44.9226 31.5352 45.2434 32.2987 44.7898 32.7459L37.8529 39.5852C37.5874 39.847 37.2223 39.9997 36.8351 39.9997H1.71917C1.07748 39.9997 0.756633 39.2362 1.21024 38.7889L8.14713 31.9497Z"
        fill="currentColor"
      />
      <path
        d="M8.14713 6.4145C8.42372 6.15271 8.78882 6 9.16498 6H44.2809C44.9226 6 45.2434 6.76355 44.7898 7.21078L37.8529 14.05C37.5874 14.3118 37.2223 14.4645 36.8351 14.4645H1.71917C1.07748 14.4645 0.756633 13.701 1.21024 13.2538L8.14713 6.4145Z"
        fill="currentColor"
      />
      <path
        d="M37.8529 19.1C37.5874 18.8383 37.2223 18.6855 36.8351 18.6855H1.71917C1.07748 18.6855 0.756633 19.4491 1.21024 19.8963L8.14713 26.7356C8.41266 26.9974 8.77776 27.1501 9.16498 27.1501H44.2809C44.9226 27.1501 45.2434 26.3865 44.7898 25.9393L37.8529 19.1Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_1955_741">
        <rect width="46" height="46" fill="none" />
      </clipPath>
    </defs>
  </svg>
);

export {
  // tabler
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandXFilled,
  IconMenu,
  IconNetwork,
  IconSparkles,

  // custom
  IconMrgn,
  IconSolana,
};
