import { IconSearch } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";

const EmodeViewAll = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-background-gray h-auto py-1 text-xs font-normal hover:bg-background-gray-light"
        >
          <IconSearch size={12} />
          View all
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-normal">E-mode Groups</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center">Emode info goes here...</p>
      </DialogContent>
    </Dialog>
  );
};

export { EmodeViewAll };
