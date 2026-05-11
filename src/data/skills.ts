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
    category: 'Languages',
    skills: [
      { name: 'JavaScript', icon: `${CDN}/javascript/javascript-original.svg` },
      { name: 'TypeScript', icon: `${CDN}/typescript/typescript-original.svg` },
      { name: 'HTML', icon: `${CDN}/html5/html5-original.svg` },
      { name: 'CSS', icon: `${CDN}/css3/css3-original.svg` },
      { name: 'Java', icon: `${CDN}/java/java-original.svg` },
      { name: 'Python', icon: `${CDN}/python/python-original.svg` },
      { name: 'C/C++', icon: `${CDN}/cplusplus/cplusplus-original.svg` },
      { name: 'SQL', icon: `${CDN}/azuresqldatabase/azuresqldatabase-original.svg` },
      { name: 'LaTeX', icon: `${CDN}/latex/latex-original.svg` },
    ],
  },
  {
    category: 'Frameworks',
    skills: [
      { name: 'React', icon: `${CDN}/react/react-original.svg` },
      { name: 'React Native', icon: `${CDN}/react/react-original.svg` },
      { name: 'Spring Boot', icon: `${CDN}/spring/spring-original.svg` },
      { name: 'Node.js', icon: `${CDN}/nodejs/nodejs-original.svg` },
      { name: 'Express', icon: `${CDN}/express/express-original.svg` },
      { name: 'TailwindCSS', icon: `${CDN}/tailwindcss/tailwindcss-original.svg` },
      { name: 'Bootstrap', icon: `${CDN}/bootstrap/bootstrap-original.svg` },
      { name: 'Three.JS', icon: `${CDN}/threejs/threejs-original.svg` },
      { name: 'Vite', icon: `${CDN}/vite/vite-original.svg` },
      { name: 'JUnit', icon: `${CDN}/junit/junit-original.svg` },
    ],
  },
  {
    category: 'Tools',
    skills: [
      { name: 'Git', icon: `${CDN}/git/git-original.svg` },
      { name: 'GitHub', icon: `${CDN}/github/github-original.svg` },
      { name: 'GitLab CI/CD', icon: `${CDN}/gitlab/gitlab-original.svg` },
      { name: 'Docker', icon: `${CDN}/docker/docker-original.svg` },
      { name: 'VS Code', icon: `${CDN}/vscode/vscode-original.svg` },
      { name: 'IntelliJ', icon: `${CDN}/intellij/intellij-original.svg` },
      { name: 'Postman', icon: `${CDN}/postman/postman-original.svg` },
      { name: 'Android Studio', icon: `${CDN}/androidstudio/androidstudio-original.svg` },
      { name: 'AWS', icon: `${CDN}/amazonwebservices/amazonwebservices-original-wordmark.svg` },
      { name: 'Gradle', icon: `${CDN}/gradle/gradle-original.svg` },
    ],
  },
  {
    category: 'Databases',
    skills: [
      { name: 'PostgreSQL', icon: `${CDN}/postgresql/postgresql-original.svg` },
      { name: 'MySQL', icon: `${CDN}/mysql/mysql-original.svg` },
      { name: 'MongoDB', icon: `${CDN}/mongodb/mongodb-original.svg` },
      { name: 'CouchDB', icon: `${CDN}/couchdb/couchdb-original.svg` },
      { name: 'DynamoDB', icon: `${CDN}/dynamodb/dynamodb-original.svg` },
    ],
  },
]
