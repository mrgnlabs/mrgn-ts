import { cn } from "@mrgnlabs/mrgn-utils";

interface ActionStatItemProps {
  label: string;
  classNames?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ActionStatItem = ({ label, classNames, children, style }: ActionStatItemProps) => {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("flex justify-end text-right items-center gap-2", classNames)} style={style}>
        {children}
      </dd>
    </>
  );
};
