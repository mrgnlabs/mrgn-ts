import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { WalletTokens } from "~/components/common/Wallet/WalletTokens";
import { Label } from "~/components/ui/label";
import { IconInfoCircle } from "~/components/ui/icons";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";

export const WalletSettings = ({ tokens }: { tokens: any[] }) => {
  return (
    <Accordion type="single" collapsible className="w-full mt-8 space-y-4">
      <AccordionItem value="assets">
        <AccordionTrigger className="bg-background-gray px-4 rounded-lg transition-colors hover:bg-background-gray-hover data-[state=open]:rounded-b-none data-[state=open]:bg-background-gray">
          Assets
        </AccordionTrigger>
        <AccordionContent className="bg-background-gray p-4 pt-0 rounded-b-lg">
          <WalletTokens tokens={tokens} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="notifications">
        <AccordionTrigger className="bg-background-gray px-4 rounded-lg transition-colors hover:bg-background-gray-hover data-[state=open]:rounded-b-none data-[state=open]:bg-background-gray">
          Notifications
        </AccordionTrigger>
        <AccordionContent className="bg-background-gray p-4 pt-0 rounded-b-lg">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-muted-foreground">
                <IconInfoCircle size={16} /> Notification email
              </Label>
              <Input id="email" type="email" placeholder="example@example.com" />
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-white">
                <Checkbox id="health" /> <Label htmlFor="health">Account heath / liquidation risk</Label>
              </li>
              <li className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-white">
                <Checkbox id="ybx" /> <Label htmlFor="ybx">YBX launch notifications</Label>
              </li>
              <li className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-white">
                <Checkbox id="updates" /> <Label htmlFor="updates">Future announcements &amp; updates</Label>
              </li>
            </ul>

            <Button type="submit">Update notifications</Button>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
