import { submitConvertKit } from "~/actions/submitConvertKit";

import { ContactForm } from "~/components/contact-form";

export default function ContactPage() {
  return (
    <div className="container pt-32">
      <div className="space-y-6 text-center max-w-md mx-auto text-muted-foreground text-lg leading-relaxed">
        <h1 className="text-5xl font-medium text-primary">Contact Us</h1>
        <p>Send us a message using the form below and we&apos;ll get back to you as soon as possible.</p>
      </div>
      <ContactForm onSubmit={submitConvertKit} formId="6643760" />
    </div>
  );
}
