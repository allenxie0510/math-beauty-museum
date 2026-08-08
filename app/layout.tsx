import type { Metadata } from "next";
import { Noto_Sans_SC, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sans = Noto_Sans_SC({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Playfair_Display({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "数学美学展 · Math Beauty Museum",
    description: "一次为好奇心准备的沉浸式数学美学互动展览——看见公式背后的美。",
    openGraph: {
      title: "数学美学展 · Math Beauty Museum",
      description: "看见公式背后的美。",
      images: [{ url: imageUrl, width: 1672, height: 941, alt: "数学美学展：发光的数学之树" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "数学美学展 · Math Beauty Museum",
      description: "看见公式背后的美。",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${sans.variable} ${display.variable}`}>{children}</body></html>;
}
