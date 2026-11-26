import Logo from "@/components/logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <span className="font-bold text-2xl text-foreground">Time</span>
        </Link>
      </div>
      {children}
    </main>
  );
}
