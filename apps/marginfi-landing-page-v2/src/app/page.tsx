import { Hero } from "~/components/hero";
import { Stats } from "~/components/stats";
import { Products } from "~/components/products";
import { Features } from "~/components/features";
import { Highlights } from "~/components/highlights";
import { Ecosystem } from "~/components/ecosystem";
import { Callout } from "~/components/callout";
import { Contact } from "~/components/contact";
import { Investors } from "~/components/investors";

export default function Home() {
  return (
    <main className="bg-[#0D0F0E]">
      <Hero />
      <Stats />
      <Products />
      <Features />
      <Highlights />
      <Ecosystem />
      <Callout />
      <Contact />
      <Investors />
    </main>
  );
}
