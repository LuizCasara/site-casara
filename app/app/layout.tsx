import type {Metadata} from "next";

export const metadata: Metadata = {
    title: "Casara apps",
    description: "Mini Apps, uma coleção de ferramentas úteis para ajudar em tarefas do dia a dia.",
};

export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <>
            {children}
        </>
    );
}
