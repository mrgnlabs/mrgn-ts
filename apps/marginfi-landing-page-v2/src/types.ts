export type Action = {
  href: string;
  text: string;
  label?: string;
};

export type Block = {
  icon: string;
  heading: string;
  body: string;
  action?: Action;
};
