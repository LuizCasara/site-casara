import type {Metadata} from "next";
import {Quicksand, Space_Mono} from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
    title: "Luiz Casara - Projects Portfolio",
    description: "Portfolio website showcasing projects and professional experience in web development and software engineering.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <link>

        </link>

        <body
            className={`${quicksand.variable} ${spaceMono.variable} antialiased min-h-screen flex flex-col`}
        >
        <Header/>
        <main className="flex-grow">
            {children}
        </main>
        <Footer/>
        </body>
        </html>
    );
}
