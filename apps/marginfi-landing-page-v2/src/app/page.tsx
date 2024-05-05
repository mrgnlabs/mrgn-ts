import { Hero } from "~/components/hero";
import { Stats } from "~/components/stats";
import { Products } from "~/components/products";
import { Features } from "~/components/features";
import { Highlights } from "~/components/highlights";

export default function Home() {
  return (
    <main>
      <Hero />
      <Stats />
      <Products />
      <Features />
      <Highlights />
    </main>
  );
}
