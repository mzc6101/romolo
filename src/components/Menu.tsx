const menuItems = [
  {
    category: "Cannoli",
    items: [
      {
        name: "Cannoli",
        description: "Crispy shell filled to order with sweet ricotta — available in Full Size or Mini",
        price: "$X.XX",
      },
      {
        name: "Cannoli Kit",
        description: "Shells and filling to assemble at home — must be purchased in multiples of 6",
        price: "$X.XX",
      },
    ],
  },
  {
    category: "Desserts",
    items: [
      {
        name: "Chocolate Banana",
        description: "Frozen banana dipped in rich chocolate",
        price: "$X.XX",
      },
      {
        name: "Cookie",
        description: "Flavors: Amaretti, Rainbow, Cucidati",
        price: "$X.XX",
      },
      {
        name: "Spumoni Wedge",
        description: "Classic Italian tri-color ice cream with candied fruit and nuts",
        price: "$X.XX",
      },
      {
        name: "Tartufi",
        description: "Chocolate-coated ice cream truffle with a molten center",
        price: "$X.XX",
      },
      {
        name: "Tiramisu",
        description: "Espresso-soaked ladyfingers layered with mascarpone cream",
        price: "$X.XX",
      },
    ],
  },
  {
    category: "Frozen Treats",
    items: [
      {
        name: "Ice Cream",
        description: "Rich, creamy Italian-style ice cream in rotating flavors",
        price: "$X.XX",
      },
      {
        name: "Milkshake",
        description: "Thick and creamy, blended with our house-made ice cream",
        price: "$X.XX",
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
            Our <span className="italic">Menu</span>
          </h2>
          <div className="ornament-divider mt-6">
            <span className="text-romolo-red text-lg">&#10045;</span>
          </div>
          <p className="mt-6 max-w-2xl mx-auto text-romolo-warm-gray leading-relaxed">
            Each cannolo is filled to order to preserve that perfect crunch.
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
                        [ Image ]
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-[var(--font-serif)] text-lg font-medium text-romolo-charcoal">
                          {item.name}
                        </h4>
                        <span className="font-[var(--font-serif)] text-lg text-romolo-red font-semibold shrink-0">
                          {item.price}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-romolo-warm-gray mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
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
