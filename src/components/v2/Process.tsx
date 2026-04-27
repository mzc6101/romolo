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
    <section id="process" className="py-24 md:py-36 bg-[#d8e2dc]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-20 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#2d6a4f] font-medium mb-4">
            Our Process
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-[#1a1a1a]">
            Made by Hand,
            <br />
            <span className="italic">With Heart</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-[1px] w-12 bg-[#2d6a4f]/30" />
            <span className="text-[#2d6a4f] text-lg">&#10045;</span>
            <div className="h-[1px] w-12 bg-[#2d6a4f]/30" />
          </div>
          <p className="mt-6 max-w-2xl mx-auto text-[#5a6b5e] leading-relaxed">
            Every cannoli that leaves our kitchen follows the same four-step
            process that Nonno Romolo perfected over six decades. No machines, no
            mass production — just patience and passion.
          </p>
        </div>

        {/* Horizontal Timeline - Desktop */}
        <div className="hidden md:block">
          {/* Images row */}
          <div className="grid grid-cols-4 gap-8 mb-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`animate-on-scroll delay-${i + 1}`}
              >
                <div className="aspect-square rounded-sm overflow-hidden relative border border-white/80 bg-white/60 backdrop-blur-sm">
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Timeline line with numbered circles */}
          <div className="relative py-6">
            {/* Connecting horizontal line */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#2d6a4f]/30 -translate-y-1/2" />

            <div className="grid grid-cols-4 gap-8 relative">
              {steps.map((step, i) => (
                <div key={step.number} className="flex flex-col items-center">
                  {/* Number circle on the line */}
                  <div className="w-12 h-12 rounded-full bg-[#2d6a4f] text-white flex items-center justify-center font-[var(--font-serif)] text-lg font-medium relative z-10">
                    {step.number}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Titles and descriptions row */}
          <div className="grid grid-cols-4 gap-8 mt-4">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`text-center animate-on-scroll delay-${i + 1}`}
              >
                <h3 className="font-[var(--font-serif)] text-xl md:text-2xl font-medium text-[#1a1a1a] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#5a6b5e] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="md:hidden space-y-12 relative">
          {/* Vertical connecting line on the left */}
          <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-[#2d6a4f]/30" />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`animate-on-scroll delay-${i + 1} flex gap-6`}
            >
              {/* Number circle */}
              <div className="shrink-0 relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#2d6a4f] text-white flex items-center justify-center font-[var(--font-serif)] text-lg font-medium">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="aspect-video rounded-sm overflow-hidden relative border border-white/80 bg-white/60 backdrop-blur-sm mb-4">
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
                <h3 className="font-[var(--font-serif)] text-xl font-medium text-[#1a1a1a] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#5a6b5e] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
