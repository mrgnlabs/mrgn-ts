import { useComputer, useMixin } from "~/hooks";

const MixinProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  useMixin();
  useComputer();

  return <div>{children}</div>;
};

export { MixinProvider };
