import { useTypingEffect } from '../hooks/useTypingEffect'

const TYPING_TEXTS = ['Full-Stack Developer', 'React/TypeScript Specialist', 'Mobile App Developer']

export default function Hero() {
  const displayText = useTypingEffect(TYPING_TEXTS)

  return (
    <section id="about-me" className="bg-white text-black flex items-center justify-center py-16">
      <div className="max-w-7xl mx-auto flex items-center gap-16 px-8 flex-col md:flex-row">
        <img
          src="/images/me.jpg"
          alt="Profile Photo"
          className="w-64 h-64 xl:w-80 xl:h-80 rounded-full border-4 border-black object-cover flex-shrink-0"
        />
        <div className="max-w-2xl text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Gabriel John Bullerman</h1>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            <span>{displayText}</span>
            <span className="animate-blink font-thin">|</span>
          </h2>
          <p className="text-lg md:text-xl leading-relaxed mb-6">
            CS graduate from Iowa State University specializing in full-stack web and mobile application
            development. Passionate about building scalable, user-centered solutions with React, TypeScript,
            Node.js, and Java backends.
          </p>
          <div className="flex gap-4 justify-center md:justify-start flex-wrap">
            <a
              href="https://github.com/GabeBullerman"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-black text-white border-2 border-black rounded-full font-bold hover:bg-white hover:text-black transition-colors duration-300 text-sm"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/gabe-bullerman/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-white text-black border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-colors duration-300 text-sm"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
