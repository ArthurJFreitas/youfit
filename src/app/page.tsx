import { ArrowDown } from "lucide-react";

import { YouFitLogo } from "@/components/brand/YouFitLogo";

export default function HomePage() {
  return (
    <main className="foundation-page">
      <header className="foundation-header">
        <YouFitLogo />
        <span className="foundation-header__pill">Entrega em casa</span>
      </header>
      <section className="foundation-hero">
        <p className="eyebrow">Fresca de verdade. Pronta para sua rotina.</p>
        <h1>Seu almoço leve, do seu jeito.</h1>
        <p>
          Escolha suas saladas, marque os dias e receba tudo fresquinho na sua porta.
        </p>
        <span className="foundation-hero__hint">
          Cardápio chegando <ArrowDown aria-hidden="true" size={18} />
        </span>
      </section>
    </main>
  );
}
