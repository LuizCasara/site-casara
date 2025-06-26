import Link from "next/link";

export default function Home() {
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
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            I build responsive, user-friendly web applications using modern technologies.
            Check out my projects below or get in touch to discuss your next project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/apps"
              className="rounded-md bg-green-500 px-5 py-3 text-white font-medium hover:bg-green-600 transition-colors"
            >
              View Some Apps
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
