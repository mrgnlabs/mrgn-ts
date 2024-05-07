import { Hero } from "~/components/hero";
import { Stats } from "~/components/stats";
import { Products } from "~/components/products";
import { Features } from "~/components/features";
import { Highlights } from "~/components/highlights";
import { Ecosystem } from "~/components/ecosystem";
import { Callout } from "~/components/callout";
import { Investors } from "~/components/investors";
import { GettingStarted } from "~/components/getting-started";
import { FAQ } from "~/components/faq";
import { Footer } from "~/components/footer";

export default function Home() {
  return (
    <main className="bg-[#0F1111]">
      <Hero />
      <Stats />
      <Products />
      <Features />
      <Highlights />
      <Callout />
      <Ecosystem />
      <Investors />
      <GettingStarted />
      <FAQ />
      <Footer />
    </main>
  );
}
