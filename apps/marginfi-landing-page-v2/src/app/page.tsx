import { submitConvertKit } from "~/actions/submitConvertKit";

import { Hero } from "~/components/hero";
import { Stats } from "~/components/stats";
import { Products } from "~/components/products";
import { Features } from "~/components/features";
import { Highlights } from "~/components/highlights";
import { Ecosystem } from "~/components/ecosystem";
import { Grants } from "~/components/grants";
import { Investors } from "~/components/investors";
import { GettingStarted } from "~/components/getting-started";
import { FAQ } from "~/components/faq";
import { Footer } from "~/components/footer";
import { LaunchButton } from "~/components/launch-button";

export default function Home() {
  return (
    <main className="bg-[#0F1111]">
      <Hero />
      <Stats />
      <Products />
      <Features />
      <Highlights />
      <Grants onSubmit={submitConvertKit} />
      <Ecosystem />
      <Investors />
      <GettingStarted />
      <FAQ />
      <Footer />
      <LaunchButton />
    </main>
  );
}
