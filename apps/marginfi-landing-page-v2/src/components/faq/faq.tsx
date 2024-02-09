import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

type FAQProps = {
  heading: string;
  body?: string;
  faq: {
    question: string;
    answer: string;
  }[];
};

export const FAQ = ({ heading, body, faq }: FAQProps) => {
  return (
    <div className="w-full pt-24 pb-16 px-6 border-t border-border">
      <div className="w-full max-w-6xl mx-auto space-y-16">
        <header className="space-y-3 flex flex-col items-center text-center">
          <h1 className="text-3xl font-medium">{heading}</h1>
          {body && <p className="text-muted-foreground w-full max-w-xl mx-auto">{body}</p>}
        </header>

        <Accordion type="single" collapsible className="w-full max-w-4xl mx-auto">
          {faq.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="hover:no-underline py-6 text-left gap-24 items-start sm:items-center">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
