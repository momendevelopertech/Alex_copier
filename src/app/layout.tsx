import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/context";

const cairo = Cairo({ subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "الكسندريا كوبير - نظام ERP",
  description: "نظام إدارة مبيعات الآلات وخدمات الصيانة - شركةكسندريا كوبير",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
