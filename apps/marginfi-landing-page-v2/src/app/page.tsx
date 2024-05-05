import { Hero } from "~/components/hero";
import { Stats } from "~/components/stats";
import { Products } from "~/components/products";
import { Features } from "~/components/features";

export default function Home() {
  return (
    <main>
      <Hero />
      <Stats />
      <Products />
      <Features />
    </main>
  );
}
