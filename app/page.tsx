"use client";

import { useState } from "react";
import { ScrollScene } from "@/components/ScrollScene";
import { pickPageTransition } from "@/lib/pageTransition";
import {
  Nav,
  NeuralNetBackgroundWrapper,
  landingSectionRegistry,
} from "./_components/landing";

export default function Landing() {
  const [transitionType] = useState(() => pickPageTransition());

  const sections = landingSectionRegistry.map(({ key, Component }) => (
    <Component key={key} />
  ));

  return (
    <main className="relative isolate bg-aura-canvas text-aura-text font-sans">
      <NeuralNetBackgroundWrapper />
      <ScrollScene nav={<Nav />} sections={sections} transitionType={transitionType} />
    </main>
  );
}
