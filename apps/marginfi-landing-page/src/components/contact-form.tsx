import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";

export const ContactForm = () => {
  return (
    <div className="relative z-10 max-w-2xl mx-auto w-full flex items-center gap-20 py-20">
      <form className="w-full flex flex-col items-center justify-center gap-8">
        <div className="grid grid-cols-2 gap-8 w-full">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Email</Label>
            <Input id="email" placeholder="email@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Telegram</Label>
            <Input id="name" placeholder="@yourhandle" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Wallet</Label>
            <Input id="name" placeholder="Your wallet address" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="name">Message</Label>
            <Textarea id="name" rows={6} placeholder="What's on your mind..."></Textarea>
          </div>
        </div>
        <Button>Submit</Button>
      </form>
    </div>
  );
};
