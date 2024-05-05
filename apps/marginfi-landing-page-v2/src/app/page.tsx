import { Hero } from "~/components/hero";
import { Stats } from "~/components/stats";
import { Products } from "~/components/products";

export default function Home() {
  return (
    <main>
      <Hero />
      <Stats />
      <Products />
    </main>
  );
}
