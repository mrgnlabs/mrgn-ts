import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

const CONTENT = {
  heading: "Frequency Asked Questions",
  faqs: [
    {
      question: "Sint id anim veniam magna pariatur duis aliquip duis eiusmod deserunt?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "Sint id anim veniam magna pariatur duis aliquip duis eiusmod deserunt?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "Sint id anim veniam magna pariatur duis aliquip duis eiusmod deserunt?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "Sint id anim veniam magna pariatur duis aliquip duis eiusmod deserunt?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "Sint id anim veniam magna pariatur duis aliquip duis eiusmod deserunt?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
    {
      question: "Sint id anim veniam magna pariatur duis aliquip duis eiusmod deserunt?",
      answer:
        "Incididunt magna non velit enim occaecat laboris officia esse mollit velit magna laborum minim. Nostrud ipsum ea fugiat commodo incididunt id Lorem veniam aliqua dolor aliquip consequat. Consectetur do tempor nisi aliqua cupidatat exercitation eiusmod laborum do. Labore sit mollit incididunt eiusmod ad amet sit irure deserunt anim qui. Cillum sunt laboris enim quis sunt excepteur. Veniam adipisicing mollit consequat velit tempor minim ad eiusmod excepteur nostrud proident sit.",
    },
  ],
};

export const FAQ = () => {
  return (
    <div className="relative z-10 container max-w-4xl w-full flex flex-col gap-8 py-24">
      <h2 className="text-3xl font-medium">{CONTENT.heading}</h2>
      <Accordion type="single" collapsible className="w-full">
        {CONTENT.faqs.map((faq, index) => (
          <AccordionItem key={index} value={index.toString()} className="py-1">
            <AccordionTrigger className="font-normal text-lg transition-colors hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              <p className="leading-loose text-muted-foreground">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
