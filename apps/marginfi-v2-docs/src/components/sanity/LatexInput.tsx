import { preprocessLatex } from '~/utils/latexPreprocessor'

export function LatexInput(props: any) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const blocks = preprocessLatex(event.target.value);
    props.onChange(blocks);
  };
  
  return (
    <textarea
      value={props.value}
      onChange={handleChange}
      placeholder="Enter text with LaTeX ($inline$ or $$block$$)"
      rows={10}
      className="w-full p-2 font-mono"
    />
  );
} 