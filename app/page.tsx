"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {FaBookOpen, FaChartLine, FaCode, FaLaugh, FaLightbulb, FaRandom} from "react-icons/fa";
import {trackGenerateQuote, trackHomePageVisit, trackQuickAccessLink, trackReceiveTip} from "@/utils/analytics";

export default function Home() {
  const [randomQuote, setRandomQuote] = useState("");
  const [randomTip, setRandomTip] = useState("");

    // Track time spent on home page
    useEffect(() => {
      return trackHomePageVisit();
    }, []);

  // Function to generate random tech tip
  const generateRandomTip = () => {
      trackReceiveTip();
    const tips = [
      "Use keyboard shortcuts to boost productivity",
      "Regular backups can save you from disaster",
      "Dark mode can reduce eye strain during night coding",
      "Learn Git branching strategies for better collaboration",
      "Try the Pomodoro technique for better focus",
      "Comment your code as if the next developer is a psychopath who knows where you live",
      "Rubber duck debugging really works!",
      "Take regular breaks to prevent burnout",
      "Learn one new programming concept each week",
      "Contribute to open source to improve your skills"
    ];
    setRandomTip(tips[Math.floor(Math.random() * tips.length)]);
  };

  // Function to generate random programming quote
  const generateRandomQuote = () => {
      trackGenerateQuote();
    const quotes = [
      "\"Code is like humor. When you have to explain it, it's bad.\" – Cory House",
      "\"It's not a bug – it's an undocumented feature.\" – Anonymous",
      "\"First, solve the problem. Then, write the code.\" – John Johnson",
      "\"The best error message is the one that never shows up.\" – Thomas Fuchs",
      "\"Programming isn't about what you know; it's about what you can figure out.\" – Chris Pine",
      "\"The most disastrous thing that you can ever learn is your first programming language.\" – Alan Kay",
      "\"The only way to learn a new programming language is by writing programs in it.\" – Dennis Ritchie",
      "\"Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.\" – Dan Salomon",
      "\"Simplicity is the soul of efficiency.\" – Austin Freeman",
      "\"Any fool can write code that a computer can understand. Good programmers write code that humans can understand.\" – Martin Fowler"
    ];
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  };

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
            Hi, I&apos;m <span className="text-green-500 dark:text-green-400">Luiz Casara</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Web Developer & Software Engineer
          </p>
          {/*<p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">*/}
          {/*  I build responsive, user-friendly web applications using modern technologies.*/}
          {/*  Check out my projects below or get in touch to discuss your next project.*/}
          {/*</p>*/}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/app"
              className="rounded-md bg-green-500 px-5 py-3 text-white font-medium hover:bg-green-600 transition-colors"
            >
              View Some Apps
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Fun Section */}
      <section className="py-12 my-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Diversão & Utilidades</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Random Quote Generator */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-500 p-4 flex items-center">
                <FaBookOpen className="text-white mr-2" size={24} />
                <h3 className="text-xl font-bold text-white">Citação Aleatória</h3>
              </div>
              <div className="p-6">
                <div className="min-h-[100px] mb-4 flex items-center justify-center">
                  <p className="text-gray-700 dark:text-gray-300 italic text-center">
                    {randomQuote || "Clique no botão para gerar uma citação de programação"}
                  </p>
                </div>
                <button 
                  onClick={generateRandomQuote}
                  className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Gerar Citação
                </button>
              </div>
            </div>

            {/* Random Tech Tip */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="bg-purple-500 p-4 flex items-center">
                <FaLightbulb className="text-white mr-2" size={24} />
                <h3 className="text-xl font-bold text-white">Dica de Tecnologia</h3>
              </div>
              <div className="p-6">
                <div className="min-h-[100px] mb-4 flex items-center justify-center">
                  <p className="text-gray-700 dark:text-gray-300 text-center">
                    {randomTip || "Clique no botão para receber uma dica de tecnologia"}
                  </p>
                </div>
                <button 
                  onClick={generateRandomTip}
                  className="w-full py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                >
                  Receber Dica
                </button>
              </div>
            </div>
          </div>

          {/* Quick Access Cards */}
          <h3 className="text-2xl font-bold mb-6 text-center">Acesso Rápido</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <Link
                  href="/app/rule-of-three"
                  className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
                  onClick={() => trackQuickAccessLink("Regra de Três")}
              >
              <FaRandom className="mx-auto mb-2 text-green-500" size={24} />
              <span className="block text-sm">Regra de Três</span>
            </Link>
              <Link
                  href="/app/compound-interest"
                  className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
                  onClick={() => trackQuickAccessLink("Juros Compostos")}
              >
              <FaChartLine className="mx-auto mb-2 text-green-500" size={24} />
              <span className="block text-sm">Juros Compostos</span>
            </Link>
              <Link
                  href="/app/qr-code"
                  className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
                  onClick={() => trackQuickAccessLink("Gerador QR Code")}
              >
              <FaCode className="mx-auto mb-2 text-green-500" size={24} />
              <span className="block text-sm">Gerador QR Code</span>
            </Link>
              <Link
                  href="/app/descubra-seu-temperamento"
                  className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
                  onClick={() => trackQuickAccessLink("Temperamento")}
              >
              <FaLaugh className="mx-auto mb-2 text-green-500" size={24} />
              <span className="block text-sm">Temperamento</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900 rounded-lg my-12 hidden">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Skills & Technologies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Tailwind CSS", "HTML", "CSS", "Git", "MongoDB", "SQL", "API Design"].map((skill, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm"
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
