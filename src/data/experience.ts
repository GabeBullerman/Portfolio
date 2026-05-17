export interface ExperienceItem {
  title: string
  company: string
  location: string
  period: string
  bullets: string[]
}

export const experienceData: ExperienceItem[] = [
  {
    title: 'Full-Stack Software Developer',
    company: 'Iowa State University',
    location: 'Ames, IA',
    period: 'Aug. 2025 – May 2026',
    bullets: [
      "Engineered full-stack classroom management system supporting 200+ students with role-based access control (Student/TA/Instructor) via Spring Security JWT and OAuth2.",
      'Developed RESTful APIs in Java Spring Boot with comprehensive authentication, securing 15+ endpoints with JWT tokens and Google OAuth2 integration.',
      'Built responsive React Native + TypeScript mobile app for attendance tracking, grading workflows, and real-time staff communication via WebSockets.',
      'Containerized services with Docker/Docker Compose, implemented automated CI/CD pipelines in GitLab, and managed PostgreSQL migrations with Flyway for production reliability.',
    ],
  },
  {
    title: 'IT Operations Specialist and Support',
    company: 'ICS Advanced Technologies',
    location: 'Ames, IA',
    period: 'June 2024 – Sep. 2024',
    bullets: [
      'Automated data entry and customer support workflows using TypeMonkey scripts, reducing average call time by 20 seconds across all employees.',
      'Configured DNS, routing tables, and DHCP across a network serving 100,000+ users, maintaining 99% first-call resolution for hardware and software issues.',
      'Implemented Dynamic PSK (DPSK) for 300+ wireless users, reducing unauthorized access incidents by 75%.',
      'Managed 200+ VLANs to segment network traffic, improving security and reducing broadcast traffic by 30%.',
    ],
  },
]
