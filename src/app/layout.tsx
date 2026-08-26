import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/context";
import { SessionProvider } from "next-auth/react";

const cairo = Cairo({ subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "اليكس كوبير - نظام ERP",
  description: "نظام إدارة مبيعات الآلات وخدمات الصيانة - اليكس كوبير",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('locale');if(l==='en'){document.documentElement.dir='ltr';document.documentElement.lang='en'}else if(l==='ar'){document.documentElement.dir='rtl';document.documentElement.lang='ar'}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={cairo.className} suppressHydrationWarning>
        <SessionProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
