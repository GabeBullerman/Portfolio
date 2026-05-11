export interface ExperienceItem {
  title: string
  company: string
  location: string
  period: string
  bullets: string[]
}

export const experienceData: ExperienceItem[] = [
  {
    title: 'Software Developer, Contract',
    company: 'Iowa State University',
    location: 'Ames, IA',
    period: 'Aug. 2025 – May 2026',
    bullets: [
      "Built a full-stack classroom management system for ISU's Senior Design program supporting role-based access (Student/TA/Instructor) across multiple course sections.",
      'Developed RESTful APIs with Java Spring Boot; secured all endpoints with JWT authentication and Google OAuth2 via Spring Security.',
      'Designed a React Native + TypeScript cross-platform app featuring attendance tracking, grading workflows, real-time staff chat via WebSockets, and GitLab commit analytics.',
      'Containerized services with Docker Compose and automated deployments via GitLab CI/CD on a Linux VM; managed PostgreSQL schema migrations with Flyway.',
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
