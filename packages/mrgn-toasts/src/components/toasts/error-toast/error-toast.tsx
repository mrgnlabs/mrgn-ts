import { IconX } from "@tabler/icons-react";

interface ErrorToastProps {
  title: string;
  message: string;
  description?: string;
  code?: number;
}

export function ErrorToast({ title, message, description, code }: ErrorToastProps) {
  return (
    <div className="w-full h-full rounded-md z-50 md:min-w-[340px]">
      <h2 className="text-lg mb-5 font-medium">{title}</h2>
      <div className="space-y-2.5">
        <div className="text-muted-foreground text-sm">
          <div className="flex items-start space-x-2">
            <div className="flex items-center space-x-2 md:w-max">
              <IconX size={16} className="flex-shrink-0 text-mrgn-error" />
              <span className="text-error">{message}</span>
            </div>
          </div>
        </div>
        {description && <div className="py-3 px-6 text-xs max-w-xs text-muted-foreground">{description}</div>}

        {code && <small className="text-primary/50 absolute top-8 right-3 text-[10px]">Code {code}</small>}
      </div>
    </div>
  );
}
