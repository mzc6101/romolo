const menuItems = [
  {
    category: "Classic Cannoli",
    items: [
      {
        name: "Ricotta Classico",
        description: "Traditional sweet ricotta filling with candied citrus peel",
        price: "$4.50",
        placeholder: "[ Cannoli Image ]",
      },
      {
        name: "Pistachio Dream",
        description: "Ricotta with Bronte pistachio cream and crushed pistachios",
        price: "$5.50",
        placeholder: "[ Cannoli Image ]",
      },
      {
        name: "Cioccolato Fondente",
        description: "Dark chocolate ricotta with cocoa nibs and chocolate chips",
        price: "$5.00",
        placeholder: "[ Cannoli Image ]",
      },
      {
        name: "Limone di Amalfi",
        description: "Lemon-infused ricotta with candied lemon zest",
        price: "$5.00",
        placeholder: "[ Cannoli Image ]",
      },
    ],
  },
  {
    category: "Signature Creations",
    items: [
      {
        name: "The Nonno Romolo",
        description: "Our original 1965 recipe — pure ricotta, orange blossom, powdered sugar",
        price: "$6.00",
        tag: "Signature",
        placeholder: "[ Cannoli Image ]",
      },
      {
        name: "Cannolo Reale",
        description: "Mascarpone and ricotta blend with amarena cherries and gold leaf",
        price: "$8.00",
        tag: "Premium",
        placeholder: "[ Cannoli Image ]",
      },
    ],
  },
  {
    category: "Dolci & More",
    items: [
      {
        name: "Sfogliatella",
        description: "Crispy layered pastry with sweet semolina and ricotta filling",
        price: "$5.50",
        placeholder: "[ Pastry Image ]",
      },
      {
        name: "Tiramisu Cup",
        description: "Individual tiramisu with espresso-soaked savoiardi and mascarpone",
        price: "$7.00",
        placeholder: "[ Dessert Image ]",
      },
      {
        name: "Espresso",
        description: "Traditional Italian espresso, single or double",
        price: "$3.50",
        placeholder: "[ Coffee Image ]",
      },
      {
        name: "Cannoli Box (6 pcs)",
        description: "Assorted selection of our finest cannoli, beautifully boxed",
        price: "$28.00",
        tag: "Gift",
        placeholder: "[ Box Image ]",
      },
    ],
  },
];

export default function Menu() {
  return (
    <section id="menu" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-20 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-romolo-red font-medium mb-4">
            Il Menu
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-romolo-charcoal">
            Our <span className="italic">Cannoli</span>
          </h2>
          <div className="ornament-divider mt-6">
            <span className="text-romolo-red text-lg">&#10045;</span>
          </div>
          <p className="mt-6 max-w-2xl mx-auto text-romolo-warm-gray leading-relaxed">
            Each cannolo is filled to order to preserve that perfect crunch.
            Prices subject to seasonal availability.
          </p>
        </div>

        {/* Menu categories */}
        <div className="space-y-20">
          {menuItems.map((category, catIdx) => (
            <div key={category.category} className={`animate-on-scroll delay-${catIdx + 1}`}>
              <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-romolo-charcoal mb-2">
                {category.category}
              </h3>
              <div className="h-[1px] bg-romolo-border mb-8 animate-draw-line origin-left" />

              <div className="grid sm:grid-cols-2 gap-6">
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    className="group flex gap-5 p-4 rounded-sm hover:bg-romolo-cream transition-colors duration-300"
                  >
                    {/* Image placeholder */}
                    <div className="w-20 h-20 shrink-0 bg-romolo-cream rounded-sm flex items-center justify-center border border-romolo-border group-hover:border-romolo-red/20 transition-colors">
                      <span className="text-[10px] text-romolo-warm-gray text-center leading-tight px-1">
                        {item.placeholder}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-[var(--font-serif)] text-lg font-medium text-romolo-charcoal">
                            {item.name}
                          </h4>
                          {"tag" in item && item.tag && (
                            <span className="text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 bg-romolo-red/10 text-romolo-red rounded-sm font-medium">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <span className="font-[var(--font-serif)] text-lg text-romolo-red font-semibold shrink-0">
                          {item.price}
                        </span>
                      </div>
                      <p className="text-sm text-romolo-warm-gray mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 animate-on-scroll">
          <p className="text-romolo-warm-gray text-sm mb-4">
            Catering & bulk orders available for events and celebrations
          </p>
          <a
            href="#contact"
            className="inline-block px-8 py-3.5 bg-romolo-red text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-romolo-red-dark transition-colors duration-300"
          >
            Inquire About Catering
          </a>
        </div>
      </div>
    </section>
  );
}
