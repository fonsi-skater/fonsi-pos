import { BrandMark } from "@/components/layout/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper-glow-bg flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <BrandMark />
      {children}
    </div>
  );
}
