import { cn } from "~/lib/utils";

const colors = [
  { var: "background", hsl: "hsl(240, 10%, 3.9%)", hex: "#08080a" },
  { var: "foreground", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "card", hsl: "hsl(240, 10%, 3.9%)", hex: "#08080a" },
  { var: "card-foreground", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "popover", hsl: "hsl(240, 10%, 3.9%)", hex: "#08080a" },
  { var: "popover-foreground", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "primary", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "primary-foreground", hsl: "hsl(240, 5.9%, 10%)", hex: "#17171b" },
  { var: "secondary", hsl: "hsl(240, 3.7%, 15.9%)", hex: "#27272a" },
  { var: "secondary-foreground", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "muted", hsl: "hsl(240, 3.7%, 15.9%)", hex: "#27272a" },
  { var: "muted-foreground", hsl: "hsl(240, 5%, 64.9%)", hex: "#a1a1a9" },
  { var: "accent", hsl: "hsl(240, 3.7%, 15.9%)", hex: "#27272a" },
  { var: "accent-foreground", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "destructive", hsl: "hsl(0, 62.8%, 30.6%)", hex: "#7f1d1d" },
  { var: "destructive-foreground", hsl: "hsl(0, 0%, 98%)", hex: "#f9f9f9" },
  { var: "border", hsl: "hsl(240, 3.7%, 15.9%)", hex: "#27272a" },
  { var: "input", hsl: "hsl(240, 3.7%, 15.9%)", hex: "#27272a" },
  { var: "ring", hsl: "hsl(240, 4.9%, 83.9%)", hex: "#d3d3d7" },
];

export default function Theme() {
  return (
    <main className="flex min-h-screen max-w-6xl mx-auto flex-col items-center justify-between py-24 px-4">
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {colors.map((color) => (
          <div key={color.var} className="space-y-2">
            <div
              className={cn(
                "w-full h-60 rounded-xl border",
                color.var === "background" && "bg-background",
                color.var === "foreground" && "bg-foreground",
                color.var === "primary" && "bg-primary",
                color.var === "secondary" && "bg-secondary",
                color.var === "destructive" && "bg-destructive",
                color.var === "muted" && "bg-muted",
                color.var === "accent" && "bg-accent",
                color.var === "popover" && "bg-popover",
                color.var === "card" && "bg-card"
              )}
            />
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-6 w-6 rounded-full border",
                  color.var === "background" && "bg-background",
                  color.var === "foreground" && "bg-foreground",
                  color.var === "primary" && "bg-primary",
                  color.var === "secondary" && "bg-secondary",
                  color.var === "destructive" && "bg-destructive",
                  color.var === "muted" && "bg-muted",
                  color.var === "accent" && "bg-accent",
                  color.var === "popover" && "bg-popover",
                  color.var === "card" && "bg-card"
                )}
              />
              <p>{color.var}</p>
            </div>
            <dl className="grid grid-cols-4 w-1/2 text-sm bg-muted text-muted-foreground">
              <dt>HSL</dt>
              <dd className="col-span-3">{color.hsl}</dd>
              <dt>HEX</dt>
              <dd className="col-span-3">{color.hex}</dd>
            </dl>
          </div>
        ))}
      </div>
    </main>
  );
}
