import Link from "next/link";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

const CONTENT = {
  heading: "Frequently Asked Questions",
  faqs: [
    {
      question: "Is there a “How to start on marginfi” quick guide?",
      answer: (
        <>
          Yes, you can find a guide on{" "}
          <Link
            href="https://medium.com/marginfi/exploring-mrgnlend-a-guide-to-decentralized-lending-and-borrowing-1e05a422a505"
            className="mrgn-link"
            target="_blank"
            rel="noreferrer"
          >
            how to get started here
          </Link>
          . We are currently working on overhauling our documentation so expect this to be improved soon. Any further
          questions please{" "}
          <Link href="https://discord.gg/mrgn" className="mrgn-link" target="_blank" rel="noreferrer">
            join our Discord server
          </Link>
          .
        </>
      ),
    },
    {
      question: "What are the fees?",
      answer: (
        <>
          Fees include borrowing interest, liquidation penalties (5%), and insurance fund fees (2.5%). For detailed fee
          structures,{" "}
          <Link
            href="https://docs.marginfi.com/concepts/the-basics/fees-+-yield"
            className="mrgn-link"
            target="_blank"
            rel="noreferrer"
          >
            please refer to our documentation
          </Link>
          .
        </>
      ),
    },
    {
      question: "What are marginfi points?",
      answer: (
        <>
          Marginfi points are earned by lending, borrowing, and referring new users, they quantify your contribution to
          the marginfi ecosystem.
          <br className="hidden md:block" /> You can{" "}
          <Link
            href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
            className="mrgn-link"
            target="_blank"
            rel="noreferrer"
          >
            learn more here
          </Link>
          .
        </>
      ),
    },
    {
      question: "How do health factors work?",
      answer: (
        <>
          Health factors indicate how well-collateralized your account is. A value below 0% exposes you to liquidation.
          To learn more{" "}
          <Link
            href="https://docs.marginfi.com/concepts/the-basics/account-health"
            className="mrgn-link"
            target="_blank"
            rel="noreferrer"
          >
            please refer to our documentation
          </Link>
          .
        </>
      ),
    },
  ],
};

export const FAQ = () => {
  return (
    <div className="relative z-10 container max-w-4xl w-full flex flex-col gap-8 py-16 lg:py-24 xl:py-32">
      <header className="flex flex-col items-center gap-4">
        <h2 className="text-5xl font-medium">{CONTENT.heading}</h2>
        <p className="text-muted-foreground">
          Below are some some common questions, please{" "}
          <Link href="https://discord.gg/mrgn" target="_blank" rel="noreferrer">
            join our Discord
          </Link>{" "}
          for more information.
        </p>
      </header>
      <Accordion type="single" collapsible className="w-full">
        {CONTENT.faqs.map((faq, index) => (
          <AccordionItem key={index} value={index.toString()} className="py-1">
            <AccordionTrigger className="font-normal transition-colors hover:no-underline lg:text-lg">
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
