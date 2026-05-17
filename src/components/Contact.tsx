const contactItems = [
  {
    icon: 'fa-brands fa-linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/gabe-bullerman/',
  },
  {
    icon: 'fa-solid fa-envelope',
    label: 'gabebullerman1@gmail.com',
    href: 'mailto:gabebullerman1@gmail.com',
  },
  {
    icon: 'fa-solid fa-phone',
    label: '319-230-0474',
    href: 'tel:3192300474',
  },
]

export default function Contact() {
  return (
    <section id="contact" className="bg-white text-black py-16">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <h2 className="text-4xl font-bold mb-10">Contact</h2>
        <ul className="list-none p-0 m-0 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
          {contactItems.map(({ icon, label, href }) => (
            <li key={label} className="flex items-center gap-3 text-lg">
              <i className={icon} />
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-black no-underline hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
