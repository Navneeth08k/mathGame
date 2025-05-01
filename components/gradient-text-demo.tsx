// components/gradient-text-demo.tsx
import { GradientText } from "@/components/ui/gradient-text";

export function GradientTextDemo() {
  return (
    <h1
      className="
        text-center text-4xl font-bold tracking-tighter
        md:text-5xl lg:text-7xl
        text-foreground          /* 👈 theme-aware colour */
      "
    >
      Challenge your math skills with{" "}
      <GradientText>Real Time 1v1s.</GradientText>
    </h1>
  );
}
