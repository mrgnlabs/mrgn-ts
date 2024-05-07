import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

const CONTENT = {
  heading: "Frequency Asked Questions",
  faqs: [
    {
      question: "Is there a “How to start on marginfi” quick guide?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "How does landing work?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "Are there lockup periods with staking?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "What are the fees?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
  ],
};

export const FAQ = () => {
  return (
    <div className="relative z-10 container max-w-4xl w-full flex flex-col gap-8 py-24 px-4 lg:px-8">
      <h2 className="text-2xl font-medium lg:text-3xl">{CONTENT.heading}</h2>
      <Accordion type="single" collapsible className="w-full">
        {CONTENT.faqs.map((faq, index) => (
          <AccordionItem key={index} value={index.toString()} className="py-1">
            <AccordionTrigger className="font-normal transition-colors hover:no-underline lg:text-lg">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              <p className="leading-loose text-muted-foreground text-sm lg:text-base">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
