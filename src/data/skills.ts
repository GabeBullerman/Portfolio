export interface Skill {
  name: string
  icon: string
}

export interface SkillCategory {
  category: string
  skills: Skill[]
}

const CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

export const skillsData: SkillCategory[] = [
  {
    category: 'Frontend',
    skills: [
      { name: 'React', icon: `${CDN}/react/react-original.svg` },
      { name: 'React Native', icon: `${CDN}/react/react-original.svg` },
      { name: 'TypeScript', icon: `${CDN}/typescript/typescript-original.svg` },
      { name: 'JavaScript', icon: `${CDN}/javascript/javascript-original.svg` },
      { name: 'TailwindCSS', icon: `${CDN}/tailwindcss/tailwindcss-original.svg` },
      { name: 'HTML/CSS', icon: `${CDN}/html5/html5-original.svg` },
      { name: 'Three.JS', icon: `${CDN}/threejs/threejs-original.svg` },
      { name: 'Vite', icon: `${CDN}/vite/vite-original.svg` },
    ],
  },
  {
    category: 'Backend',
    skills: [
      { name: 'Java', icon: `${CDN}/java/java-original.svg` },
      { name: 'Spring Boot', icon: `${CDN}/spring/spring-original.svg` },
      { name: 'Node.js', icon: `${CDN}/nodejs/nodejs-original.svg` },
      { name: 'Express', icon: `${CDN}/express/express-original.svg` },
      { name: 'REST APIs', icon: `${CDN}/nodejs/nodejs-original.svg` },
      { name: 'SQL', icon: `${CDN}/azuresqldatabase/azuresqldatabase-original.svg` },
      { name: 'Python', icon: `${CDN}/python/python-original.svg` },
      { name: 'C/C++', icon: `${CDN}/cplusplus/cplusplus-original.svg` },
    ],
  },
  {
    category: 'Databases',
    skills: [
      { name: 'PostgreSQL', icon: `${CDN}/postgresql/postgresql-original.svg` },
      { name: 'MySQL', icon: `${CDN}/mysql/mysql-original.svg` },
      { name: 'MongoDB', icon: `${CDN}/mongodb/mongodb-original.svg` },
      { name: 'DynamoDB', icon: `${CDN}/dynamodb/dynamodb-original.svg` },
      { name: 'CouchDB', icon: `${CDN}/couchdb/couchdb-original.svg` },
    ],
  },
  {
    category: 'DevOps & Tools',
    skills: [
      { name: 'Git', icon: `${CDN}/git/git-original.svg` },
      { name: 'GitHub', icon: `${CDN}/github/github-original.svg` },
      { name: 'GitLab CI/CD', icon: `${CDN}/gitlab/gitlab-original.svg` },
      { name: 'Docker', icon: `${CDN}/docker/docker-original.svg` },
      { name: 'Docker Compose', icon: `${CDN}/docker/docker-original.svg` },
      { name: 'AWS', icon: `${CDN}/amazonwebservices/amazonwebservices-original-wordmark.svg` },
      { name: 'Android Studio', icon: `${CDN}/androidstudio/androidstudio-original.svg` },
      { name: 'VS Code', icon: `${CDN}/vscode/vscode-original.svg` },
    ],
  },
]
