import "./gradient-border-box.css";

type GradientBorderBoxProps = {
  icon?: JSX.Element;
  title: string;
  description?: string;
  action?: JSX.Element;
};

export const GradientBorderBox = ({ icon, title, description, action }: GradientBorderBoxProps) => {
  return (
    <div className="gradient-border-box py-8 px-16 w-full h-full">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <h2 className="text-xl">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-3">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
};
