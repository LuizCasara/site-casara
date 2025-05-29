import Image from "next/image";
import Link from "next/link";

// Project data - real projects I've worked on
const projects = [
  {
    id: 1,
    title: "Grupo Escoteiro Aldeia Verde",
    description: "Website for a scout group with history and applications for members and volunteers.",
    image: "/thumbnails/geavThumb.png",
    tags: ["Next.js", "React", "Tailwind CSS", "Responsive Design"],
    link: "https://www.gealdeiaverde.org/"
  },
  {
    id: 2,
    title: "Gusloseimas",
    description: "E-commerce website for a gourmet confectionery business with product catalog and ordering system.",
    image: "/thumbnails/gusloseimasThumb.jpg",
    tags: ["Next.js", "React", "Tailwind CSS", "Responsive Design"],
    link: "https://www.gusloseimas.com/"
  },
  {
    id: 3,
    title: "Soupe",
    description: "CRM platform for business automation and decision-making with analytics and reporting tools.",
    image: "/thumbnails/soupeThumb.png",
    tags: ["Next.js", "React", "Node.js", "Tailwind CSS", "Responsive Design", "PostgresSQL", "Java", "API Integration"],
    link: "https://www.soupe.app/"
  }
];

export const metadata = {
  title: "Projects | Luiz Casara",
  description: "Browse through my portfolio of web development and software engineering projects.",
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">My Projects</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Browse through my portfolio of web development and software engineering projects.
            Each project demonstrates different skills and technologies.
          </p>
        </header>

        {/* Filter options could be added here */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-48 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <Image
                  src={project.image}
                  alt={project.title}
                  width={300}
                  height={300}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link 
                  href={project.link} 
                  className="text-green-500 dark:text-green-400 font-medium hover:underline"
                >
                  View Project →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
