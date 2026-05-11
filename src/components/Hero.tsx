import { useTypingEffect } from '../hooks/useTypingEffect'

const TYPING_TEXTS = ['Software Engineer', 'Fullstack Developer', 'TypeScript Developer']

export default function Hero() {
  const displayText = useTypingEffect(TYPING_TEXTS)

  return (
    <section id="about-me" className="bg-white text-black flex items-center justify-center py-16">
      <div className="max-w-5xl mx-auto flex items-center gap-16 px-8 flex-col md:flex-row">
        <img
          src="/images/me.jpg"
          alt="Profile Photo"
          className="w-64 h-64 rounded-full border-4 border-black object-cover flex-shrink-0"
        />
        <div className="max-w-xl text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Gabriel John Bullerman</h1>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            <span>{displayText}</span>
            <span className="animate-blink font-thin">|</span>
          </h2>
          <p className="text-lg md:text-xl leading-relaxed">
            Undergraduate Computer Science major at Iowa State University. Interested in full-stack
            development, mobile apps, and webapps.
          </p>
        </div>
      </div>
    </section>
  )
}
