
import { ReactNode } from "react";
import { Navbar } from "@/components/navbar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
}
