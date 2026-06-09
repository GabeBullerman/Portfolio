export interface Project {
  title: string
  subtitle: string
  description: string
  image: string
  imageAlt: string
  link: string
  tags: string[]
}

export const projectsData: Project[] = [
  {
    title: 'MusiQuest',
    subtitle: 'Full-Stack Mobile App',
    description:
      'Full-stack Android application for music educators featuring real-time global chat, dynamic leaderboards, and social networking via WebSockets. Handled backend data management with MongoDB and real-time synchronization for scalable multi-user interactions.',
    image: '/images/ImageAI-262x242.gif',
    imageAlt: 'MusiQuest',
    link: 'https://github.com/GabeBullerman/MusiQuest',
    tags: ['Java', 'Android Studio', 'MongoDB', 'WebSockets', 'Real-time Sync'],
  },
  {
    title: 'Lusiant',
    subtitle: 'Full-Stack E-Commerce Platform',
    description:
      "A bespoke storefront and admin panel for Lusiant, a porcelain-inspired denim brand, rebuilt from scratch on Next.js, Supabase, and Stripe. Its centerpiece is a hand-coded “self-drawing” porcelain floral hero — a custom vector-tracing animation pipeline — plus an automated system that generates the brand’s adaptive favicon and wordmark from source artwork.",
    image: '/images/lusiant.gif',
    imageAlt: 'Lusiant',
    link: 'https://lusiant.vercel.app',
    tags: ['Next.js', 'React', 'TypeScript', 'Supabase', 'Stripe', 'Tailwind CSS'],
  },
  {
    title: 'Rainfall Simulation',
    subtitle: 'Watershed Simulator',
    description:
      'Developed a rainshed simulator that generates BMP images and videos using mathematical models of rainfall, evaporation, and waterflow.',
    image: '/images/WatershedSimulation.gif',
    imageAlt: 'Watershed Simulation',
    link: 'https://github.com/GabeBullerman/Watershed-Simulation',
    tags: ['C', 'BMP', 'GitHub'],
  },
  {
    title: 'Hotel ERP',
    subtitle: 'Enterprise Software',
    description:
      'Hotel enterprise software written in Java that models a hypothetical hotel chain. Handles all parts of the business with file-system based storage per client requirements.',
    image: '/images/Hotel-logo.jpg',
    imageAlt: 'Hotel ERP',
    link: 'https://github.com/GabeBullerman/Hotel-ERP',
    tags: ['Java', 'File I/O', 'OOP'],
  },
  {
    title: 'Interactive 3D Web Projects',
    subtitle: 'Advanced Frontend Development',
    description:
      'Advanced web projects showcasing modern frontend capabilities: custom GLSL shaders, real-time lighting systems, 3D model imports, physics engines, and interactive debug interfaces. Built with Three.js and TypeScript demonstrating expertise in WebGL and performance optimization.',
    image: '/images/vercel-logo.png',
    imageAlt: 'Vercel',
    link: 'https://vercel.com/gabe-bullermans-projects',
    tags: ['Three.js', 'TypeScript', 'WebGL', 'GLSL', 'Vite'],
  },
]
