import { NeuralNetBackground } from "@/components/NeuralNetBackground";

export function NeuralNetBackgroundWrapper() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 mesh-minimal" aria-hidden />
      <NeuralNetBackground />
      <div
        className="pointer-events-none fixed inset-0 bg-[url('/aura-noise.svg')] opacity-[0.22] mix-blend-overlay [background-size:220px_220px]"
        aria-hidden
      />
    </>
  );
}
