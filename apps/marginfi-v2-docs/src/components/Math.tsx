import katex from 'katex';
import 'katex/dist/katex.min.css';

export const Math = ({ children }: { children: any }) => {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(children, {
          throwOnError: false,
        }),
      }}
    />
  );
};
