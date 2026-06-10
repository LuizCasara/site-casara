import type {Metadata} from "next";
import {Analytics} from "@vercel/analytics/next"
import {SpeedInsights} from "@vercel/speed-insights/next"
import {Quicksand, Space_Mono} from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {LanguageProvider} from "@/context/LanguageContext";

const quicksand = Quicksand({
    variable: "--font-quicksand",
    subsets: ["latin"],
    display: "swap",
});

const spaceMono = Space_Mono({
    variable: "--font-space-mono",
    subsets: ["latin"],
    weight: ["400", "700"],
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL("https://luizcasara.com"),
    title: {
        default: "Luiz Casara",
        template: "%s | Luiz Casara",
    },
    description: "Tech Lead e Senior Full-Stack Engineer com 10+ anos construindo software de alta criticidade em escala. Responsável por 9 produtos financeiros com SLA de ≤20ms e 350+ TPS.",
    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: "https://luizcasara.com",
        siteName: "Luiz Casara",
        title: "Luiz Casara – Tech Lead · Senior Full-Stack Engineer",
        description: "10+ anos construindo software de alta criticidade em escala fintech. React, TypeScript, GraphQL, Node.js, Next.js.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Luiz Casara – Tech Lead · Senior Full-Stack Engineer",
        description: "10+ anos construindo software de alta criticidade em escala fintech. React, TypeScript, GraphQL, Node.js, Next.js.",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <head>
            <title>Luiz Casara</title>
            <link rel="manifest" href="/manifest.json"/>
            <link rel="icon" href="/favicon-32x32.png"/>
            <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        </head>

        <body
            className={`${quicksand.variable} ${spaceMono.variable} antialiased min-h-screen flex flex-col`}
        >
        <LanguageProvider>
            <Header/>
            <main className="flex-grow">
                {children}
                <Analytics/>
                <SpeedInsights/>
            </main>
            <Footer/>
        </LanguageProvider>
        </body>
        </html>
    )
        ;
}
