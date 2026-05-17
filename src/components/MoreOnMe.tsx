const columns = [
  {
    title: 'Technical Philosophy',
    text: "I believe in writing clean, maintainable code and building scalable systems from day one. I'm passionate about mastering new technologies and frameworks — whether it's advanced WebGL rendering, real-time WebSocket architectures, or microservices design. Every project is an opportunity to deepen my expertise in full-stack development and deliver solutions that users love.",
  },
  {
    title: 'Growth Mindset',
    text: "I learn something new about software development every single day. From optimizing React performance to architecting backend systems, I'm constantly pushing my boundaries. I actively contribute to open source, explore emerging technologies, and stay current with industry best practices. This drive to continually improve makes me a better engineer and a valuable addition to any development team.",
  },
  {
    title: 'What Drives Me',
    text: 'Since getting my first laptop at age 8, I\'ve been obsessed with computers. I went from building custom PCs to discovering the real power comes from great software. Now I\'m dedicated to creating solutions that solve real problems and make an impact. Whether it\'s building intuitive mobile apps, crafting performant web experiences, or architecting robust backends, I love turning ideas into reality.',
  },
]

export default function MoreOnMe() {
  return (
    <section id="me" className="bg-black text-white py-16">
      <div className="max-w-7xl mx-auto px-8">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">More on Me</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/30">
          {columns.map((col) => (
            <div key={col.title} className="px-8 py-6 md:py-0">
              <h3 className="text-2xl font-bold mb-4">{col.title}</h3>
              <p className="text-sm md:text-base leading-relaxed text-white/80">{col.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
