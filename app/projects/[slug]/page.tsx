import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

// Project data - in a real app, this would come from a database or API
const projects = [
  {
    id: 1,
    slug: "e-commerce",
    title: "E-commerce Platform",
    description: "A full-stack e-commerce platform built with Next.js, Node.js, and MongoDB.",
    image: "/next.svg", // Placeholder image
    tags: ["Next.js", "Node.js", "MongoDB", "Tailwind CSS"],
    fullDescription: `
      This e-commerce platform provides a complete solution for online stores. It includes features such as:

      • User authentication and authorization
      • Product catalog with categories and search
      • Shopping cart and checkout process
      • Order management and tracking
      • Admin dashboard for inventory management
      • Payment processing integration

      The application was built using Next.js for the frontend, with Node.js and Express for the backend API. 
      MongoDB was used as the database, and the entire UI was styled using Tailwind CSS.
    `,
    challenges: "One of the main challenges was implementing a secure and efficient payment processing system while ensuring a smooth user experience throughout the checkout process.",
    solution: "I implemented a custom checkout flow with Stripe integration, focusing on security and user experience. The solution includes form validation, error handling, and a streamlined process to reduce cart abandonment.",
    link: "https://example.com/e-commerce",
    github: "https://github.com/username/e-commerce"
  },
  {
    id: 2,
    slug: "portfolio",
    title: "Portfolio Website",
    description: "A responsive portfolio website built with Next.js and Tailwind CSS.",
    image: "/vercel.svg", // Placeholder image
    tags: ["Next.js", "Tailwind CSS", "TypeScript"],
    fullDescription: `
      This portfolio website showcases my projects and skills as a web developer. Key features include:

      • Responsive design that works on all devices
      • Dark mode support
      • Project showcase with filtering options
      • Contact form with validation
      • Blog section for sharing insights

      The site was built using Next.js and TypeScript, with Tailwind CSS for styling.
    `,
    challenges: "Creating a design that effectively showcases projects while maintaining fast performance and accessibility standards.",
    solution: "I used Next.js's image optimization and static generation features to ensure fast loading times. The design was created with a mobile-first approach and tested across multiple devices and screen sizes.",
    link: "https://example.com/portfolio",
    github: "https://github.com/username/portfolio"
  },
  // Add more projects with their details...
];

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const project = projects.find(p => p.slug === params.slug);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found."
    };
  }

  return {
    title: `${project.title} | Luiz Casara`,
    description: project.description,
  };
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const project = projects.find(p => p.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/projects" className="text-green-500 dark:text-green-400 hover:underline mb-8 inline-block">
          ← Back to Projects
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg mb-8">
          <div className="h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Image
              src={project.image}
              alt={project.title}
              width={150}
              height={150}
              className="dark:invert"
            />
          </div>

          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">{project.title}</h1>

            <div className="flex flex-wrap gap-2 mb-6">
              {project.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg mb-6">{project.description}</p>

              <h2 className="text-xl font-bold mt-8 mb-4">Project Details</h2>
              <div className="whitespace-pre-line">{project.fullDescription}</div>

              <h2 className="text-xl font-bold mt-8 mb-4">Challenges</h2>
              <p>{project.challenges}</p>

              <h2 className="text-xl font-bold mt-8 mb-4">Solution</h2>
              <p>{project.solution}</p>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <a 
                  href={project.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rounded-md bg-green-500 px-5 py-3 text-white font-medium hover:bg-green-600 transition-colors text-center"
                >
                  View Live Project
                </a>
                <a 
                  href={project.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rounded-md bg-gray-200 dark:bg-gray-800 px-5 py-3 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
