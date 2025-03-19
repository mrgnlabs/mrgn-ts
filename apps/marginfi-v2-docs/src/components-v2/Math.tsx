import katex from 'katex';
import 'katex/dist/katex.min.css';
import clsx from 'clsx';

interface MathProps {
  children: string;
  display?: boolean;
  className?: string;
}

export const Math = ({ children, display = false, className }: MathProps) => {
  return (
    <div
      className={clsx(
        'math',
        display && 'my-6 flex justify-center text-xl',
        className
      )}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(children, {
          throwOnError: false,
          displayMode: display,
        }),
      }}
    />
  );
};
