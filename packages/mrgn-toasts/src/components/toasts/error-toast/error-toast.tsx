import { IconX } from "@tabler/icons-react";

interface ErrorToastProps {
  title: string;
  description: string;
  code?: number;
}

export function ErrorToast({ title, description, code }: ErrorToastProps) {
  return (
    <div className="w-full h-full rounded-md z-50 md:min-w-[340px]">
      <h2 className="text-lg mb-5 font-medium">{title}</h2>
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          <IconX size={16} className="text-mrgn-error flex-shrink-0" />
          <span className="text-error text-sm leading-snug">{description}</span>
        </div>
        {code && <small className="text-primary/50 text-xs pr-2">Code {code}</small>}
      </div>
    </div>
  );
}
