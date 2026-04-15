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
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#d4a574] font-medium mb-4">
            Il Menu
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-[#1a1a1a]">
            Our <span className="italic">Menu</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-[1px] w-12 bg-[#d4a574]/30" />
            <span className="text-[#d4a574] text-lg">&#10045;</span>
            <div className="h-[1px] w-12 bg-[#d4a574]/30" />
          </div>
          <p className="mt-6 max-w-2xl mx-auto text-[#8a7e75] leading-relaxed">
            Each cannolo is filled to order to preserve that perfect crunch.
          </p>
        </div>

        {/* Menu categories */}
        <div className="space-y-20">
          {menuItems.map((category, catIdx) => (
            <div key={category.category} className={`animate-on-scroll delay-${catIdx + 1}`}>
              <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-[#1a1a1a] mb-2">
                {category.category}
              </h3>
              <div className="h-[1px] bg-[#e0d8d0] mb-8 animate-draw-line origin-left" />

              {/* Single column layout */}
              <div className="grid grid-cols-1 gap-6">
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    className="group flex gap-5 p-4 rounded-sm hover:bg-[#f5f0eb] transition-colors duration-300"
                  >
                    {/* Image placeholder */}
                    <div className="w-20 h-20 shrink-0 bg-[#f5f0eb] rounded-sm flex items-center justify-center border border-[#e0d8d0] group-hover:border-[#d4a574]/20 transition-colors">
                      <span className="text-[10px] text-[#8a7e75] text-center leading-tight px-1">
                        [ Image ]
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-[var(--font-serif)] text-lg font-medium text-[#1a1a1a]">
                          {item.name}
                        </h4>
                        <span className="font-[var(--font-serif)] text-lg text-[#d4a574] font-semibold shrink-0">
                          {item.price}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-[#8a7e75] mt-1 leading-relaxed">
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
          <p className="text-[#8a7e75] text-sm mb-4">
            Catering & bulk orders available for events and celebrations
          </p>
          <a
            href="#contact"
            className="inline-block px-8 py-3.5 bg-[#d4a574] text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#b8915f] transition-colors duration-300"
          >
            Inquire About Catering
          </a>
        </div>
      </div>
    </section>
  );
}
