import Image from "next/image";
import Link from "next/link";
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope, FaGlobe } from "react-icons/fa";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-8 text-center">
          About <span className="text-green-500 dark:text-green-400">Me</span>
        </h1>

        <div className="flex flex-col md:flex-row gap-8 items-center mb-12">
          {/* Photo with animation */}
          <div className="w-full md:w-1/3 flex justify-center">
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-green-500 shadow-xl transform transition-transform hover:scale-105 duration-300">
              <Image
                src="/luiz.jpeg"
                alt="Luiz Claudio Perin Casara"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Introduction */}
          <div className="w-full md:w-2/3">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="mr-2">Greetings</span> 
              <span className="animate-bounce inline-block">🐸</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              My name is Luiz Claudio Perin Casara, hailing from Brazil (🇧🇷), and I have been working as a Developer since 2015. 
              Most of my experience comes from working with JS, ECS6, Node, React, React Native, Cypress, SQL, Postgress, and Oracle, 
              and I am currently <b>TechLead</b> and involved in security level projects at <a href="https://dock.tech" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">Dock</a>.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              I am driven by new challenges, constantly looking for solutions to complex problems which others might avoid.
            </p>
          </div>
        </div>

        {/* More about me section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-12 transform transition-all hover:shadow-xl duration-300">
          <h2 className="text-2xl font-bold mb-6">More About Me</h2>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              I possess a unique ability to simplify complex explanations while ensuring attention is paid to detail. 
              I always strive to question projects to ensure we deliver the best possible experience for the end-user.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              I am eager to learn and discover new libraries and frameworks, and I love working with people to share 
              problem-solving strategies, make new connections, and find out more about the applications and life in general.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start">
                <span className="text-2xl mr-3">🔭</span>
                <p className="text-gray-600 dark:text-gray-400">At the moment, I am working on &quot;how to create a good young developer... with my son&quot; 😆</p>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">🌱</span>
                <p className="text-gray-600 dark:text-gray-400">Currently, I am learning AWS and GoLang</p>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">💬</span>
                <p className="text-gray-600 dark:text-gray-400">Ask me about Scouts Group, i love this movement!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connect with me section */}
        <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6">Connect With Me</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Feel free to reach me at <a href="mailto:luiz9493@gmail.com" className="text-green-500 hover:underline">luiz9493@gmail.com</a> or on Telegran
          </p>

          <div className="flex justify-center space-x-6 mb-8">
            <Link 
              href="https://github.com/LuizCasara" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transform transition-transform hover:scale-110"
            >
              <FaGithub className="h-8 w-8" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link 
              href="https://www.linkedin.com/in/luiz-claudio-perin-casara-8bb1a5ab/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transform transition-transform hover:scale-110"
            >
              <FaLinkedin className="h-8 w-8" />
              <span className="sr-only">LinkedIn</span>
            </Link>
            <Link 
              href="https://www.instagram.com/luiz_cpc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-pink-600 hover:text-pink-800 dark:text-pink-400 dark:hover:text-pink-300 transform transition-transform hover:scale-110"
            >
              <FaInstagram className="h-8 w-8" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link 
              href="mailto:luiz9493@gmail.com"
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transform transition-transform hover:scale-110"
            >
              <FaEnvelope className="h-8 w-8" />
              <span className="sr-only">Email</span>
            </Link>
            <Link 
              href="https://bio.site/luizcasara"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transform transition-transform hover:scale-110"
            >
              <FaGlobe className="h-8 w-8" />
              <span className="sr-only">Bio Site</span>
            </Link>
          </div>

          {/*<div className="inline-flex items-center justify-center w-full">*/}
          {/*  <hr className="w-64 h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />*/}
          {/*  <span className="absolute px-3 font-medium text-gray-900 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-gray-900">Would you like to find me?</span>*/}
          {/*</div>*/}

          {/*<div className="flex flex-wrap justify-center gap-4">*/}
          {/*  <a */}
          {/*    href="https://github.com/LuizCasara" */}
          {/*    target="_blank" */}
          {/*    rel="noopener noreferrer" */}
          {/*    className="px-3 py-1 text-xs font-medium text-center text-white bg-gray-700 rounded-full hover:bg-gray-800 transition-colors flex items-center"*/}
          {/*  >*/}
          {/*    <FaGithub className="mr-1" /> GitHub Profile*/}
          {/*  </a>*/}
          {/*  <a */}
          {/*    href="https://www.linkedin.com/in/luiz-claudio-perin-casara-8bb1a5ab/" */}
          {/*    target="_blank" */}
          {/*    rel="noopener noreferrer" */}
          {/*    className="px-3 py-1 text-xs font-medium text-center text-white bg-blue-700 rounded-full hover:bg-blue-800 transition-colors flex items-center"*/}
          {/*  >*/}
          {/*    <FaLinkedin className="mr-1" /> LinkedIn Profile*/}
          {/*  </a>*/}
          {/*  <a */}
          {/*    href="https://www.instagram.com/luiz_cpc" */}
          {/*    target="_blank" */}
          {/*    rel="noopener noreferrer" */}
          {/*    className="px-3 py-1 text-xs font-medium text-center text-white bg-pink-600 rounded-full hover:bg-pink-700 transition-colors flex items-center"*/}
          {/*  >*/}
          {/*    <FaInstagram className="mr-1" /> Instagram Profile*/}
          {/*  </a>*/}
          {/*</div>*/}
        </div>
      </div>
    </div>
  );
}
