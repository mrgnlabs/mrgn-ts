import { ContactForm } from "~/components/contact-form";

export default function ContactPage() {
  return (
    <div className="container pt-32">
      <div className="space-y-6 text-center max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
        <h1 className="text-5xl font-medium text-primary">Contact Us</h1>
        <p>
          Id consectetur cillum id veniam. Ad labore cillum nisi sit consequat cillum elit sint veniam Lorem incididunt
          nulla in velit. Qui tempor sit ut velit ea culpa eu cillum.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
