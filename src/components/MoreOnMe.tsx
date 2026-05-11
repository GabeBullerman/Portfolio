const columns = [
  {
    title: 'Hobbies',
    text: "I've always enjoyed practicing my spontaneity. My most recent endeavors include piano, automotive mechanical work, and film. In my childhood home, there was a grand piano that nobody knew how to play — after moving out, I finally decided to honor it and have been self-teaching music theory ever since. I also bought a Kawasaki sports bike, took it apart, rebuilt it, and heavily modified it within a year. And I've dedicated a lot of time to studying the art of film and watching the IMDB top 250 — Interstellar being my favorite.",
  },
  {
    title: 'Journeys',
    text: "I have been fortunate enough to travel the world far and wide. I visited 49/50 states (New Mexico left) from birth to 21 years old — the mountains of Colorado, neon lights of NYC, beaches of Hawaii, and glaciers of Alaska. Internationally, I've hiked and photographed much of Greece, enjoyed the culinary and renaissance arts of Italy, and treasured the cultural suburbs and technological cities of Japan.",
  },
  {
    title: 'Industry',
    text: 'Since receiving my first laptop at age 8, I\'ve had an infatuation with computers. Between side work and helping friends and family, I\'ve built over 40 desktop computers. A conversation in high school sparked something in me when a friend asked, "So you can build them and make them do stuff?" — since that moment, I put hardware on the backburner and dedicated everything to software. I want to make computers valuable in the way that great software does. It\'s what drives my career.',
  },
]

export default function MoreOnMe() {
  return (
    <section id="me" className="bg-black text-white py-16">
      <div className="max-w-5xl mx-auto px-8">
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
