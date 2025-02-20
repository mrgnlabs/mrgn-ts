import { IconX } from "@tabler/icons-react";

interface ErrorToastProps {
  title: string;
  description: string;
  code?: number;
}

export function ErrorToast({ title, description, code }: ErrorToastProps) {
  return (
    <div className="w-full h-full rounded-md z-50 md:min-w-[340px] pr-4 font-light">
      <h2 className="text-lg mb-5 font-normal">{title}</h2>
      <div className="flex justify-between items-start">
        <div className="flex items-start justify-center space-x-2">
          <IconX size={16} className="flex-shrink-0 text-mrgn-error pt-1" />
          <span>{description}</span>
        </div>
        {code && <small className="text-primary/50 text-xs pr-2">Code {code}</small>}
      </div>
    </div>
  );
}
