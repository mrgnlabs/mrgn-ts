import { cn } from "@mrgnlabs/mrgn-utils";

interface ActionStatItemProps {
  label: string | React.JSX.Element;
  classNames?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ActionStatItem = ({ label, classNames, children, style }: ActionStatItemProps) => {
  return (
    <>
      <dt className="text-muted-foreground col-span-2">{label}</dt>
      <dd className={cn("flex justify-end text-right items-center gap-2 col-span-4", classNames)} style={style}>
        {children}
      </dd>
    </>
  );
};
