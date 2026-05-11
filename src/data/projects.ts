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
    subtitle: 'Mobile App',
    description:
      'Developed a full-stack Android application for early-education music teachers with real-time global chat, leaderboards, and friends list via WebSockets.',
    image: '/images/ImageAI-262x242.gif',
    imageAlt: 'MusiQuest',
    link: 'https://github.com/GabeBullerman/MusiQuest',
    tags: ['Java', 'Android Studio', 'Gradle', 'MongoDB', 'WebSockets'],
  },
  {
    title: 'Lusiant',
    subtitle: 'Web App',
    description:
      'Built a full-stack e-commerce SPA for a clothing brand with payment API integration and a MySQL database managing customer tickets, purchases, and rewards.',
    image: '/images/lusiant.gif',
    imageAlt: 'Lusiant',
    link: 'https://github.com/GabeBullerman/Lusiant',
    tags: ['React', 'Node.js', 'MySQL', 'JavaScript', 'TailwindCSS'],
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
    title: 'Mini Projects',
    subtitle: '3D Web Design',
    description:
      'A collection of 3D web design projects covering shaders, lighting, model imports from Blender, physics engines, and debug UI.',
    image: '/images/vercel-logo.png',
    imageAlt: 'Vercel',
    link: 'https://vercel.com/gabe-bullermans-projects',
    tags: ['Three.JS', 'Vite', 'Shaders', 'WebGL'],
  },
]
