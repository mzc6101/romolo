import Image from "next/image";

const steps = [
  {
    number: "01",
    title: "The Dough",
    description:
      "We start with a centuries-old recipe — flour, sugar, a touch of Marsala wine, and lard for that signature flakiness. The dough is kneaded by hand until it reaches the perfect elasticity.",
    image:
      "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775679656/_N8Z0124_xmcrvy.jpg",
    imageAlt: "Hands kneading cannoli dough on a marble countertop",
  },
  {
    number: "02",
    title: "The Shell",
    description:
      "Each shell is rolled paper-thin, wrapped around traditional metal tubes, and fried in small batches until golden and blistered. We fry to order — a Romolo's shell always shatters.",
    image:
      "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775679767/_N8Z0547_jzapgm.jpg",
    imageAlt: "Cannoli shells frying in golden oil",
  },
  {
    number: "03",
    title: "The Filling",
    description:
      "Fresh ricotta, strained overnight, folded with just enough sugar and a whisper of vanilla. No shortcuts, no stabilizers — only the real thing, made fresh each morning.",
    image:
      "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775679595/_N8Z0582_yktkoz.jpg",
    imageAlt: "Creamy ricotta filling being prepared in a copper bowl",
  },
  {
    number: "04",
    title: "The Finish",
    description:
      "Piped to order, garnished with crushed pistachios, candied orange peel, or dark chocolate chips. Every cannoli leaves our hands as a small work of edible art.",
    image:
      "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328121/_N8Z0971_afadsx.jpg",
    imageAlt: "Finished cannoli being garnished with pistachios",
  },
];

export default function Process() {
  return (
    <section id="process" className="py-24 md:py-36 bg-[#2a2520]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-20 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#d4a574] font-medium mb-4">
            Our Process
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-[#f5f0eb]">
            Made by Hand,
            <br />
            <span className="italic">With Heart</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-[1px] w-12 bg-[#d4a574]/30" />
            <span className="text-[#d4a574] text-lg">&#10045;</span>
            <div className="h-[1px] w-12 bg-[#d4a574]/30" />
          </div>
          <p className="mt-6 max-w-2xl mx-auto text-[#8a7e75] leading-relaxed">
            Every cannoli that leaves our kitchen follows the same four-step
            process that Nonno Romolo perfected over six decades. No machines, no
            mass production — just patience and passion.
          </p>
        </div>

        {/* Steps - 2-col grid */}
        <div className="space-y-16 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`animate-on-scroll delay-${i + 1}`}
            >
              {/* Step image */}
              <div className="aspect-square bg-[#3a332d] rounded-sm mb-6 border border-[#3a332d] overflow-hidden relative">
                <Image
                  src={step.image}
                  alt={step.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Content */}
              <div className="flex items-start gap-4">
                <span className="font-[var(--font-serif)] text-5xl font-light text-[#f5f0eb]/10 leading-none shrink-0">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-[var(--font-serif)] text-xl md:text-2xl font-medium text-[#f5f0eb] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#8a7e75] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
