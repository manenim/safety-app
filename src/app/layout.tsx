import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import "./social.css";
import { Shell } from "@/components/ui";

const font = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  icons: { icon: "/signalcheck-mark.svg" },
  title: {
    default: "SignalCheck | Community evidence, with context",
    template: "%s | SignalCheck",
  },
  description:
    "Community safety signals with transparent evidence, source independence, and freshness.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={font.className}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
