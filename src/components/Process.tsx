import Image from "next/image";

type Step = {
  number: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  personable?: boolean;
};

const steps: Step[] = [
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
    title: "Yours, Filled to Order",
    description:
      "Aaron pipes each cannolo when you order it — never before. Garnished with pistachio, candied orange, or chocolate.",
    image:
      "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775679842/_N8Z0606_wcehwu.jpg",
    imageAlt: "Aaron handing a cannolo to a customer at the counter",
    personable: true,
  },
];

export default function Process() {
  return (
    <section id="process" className="py-24 md:py-36 bg-romolo-blue">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="mb-16 md:mb-24 animate-on-scroll">
          <div className="flex items-center gap-6 mb-8">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              Our Process
            </p>
          </div>
          <h2 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-7xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em]">
            Made by Hand,
            <br />
            <span className="italic">With Heart</span>
          </h2>
          <p className="mt-10 max-w-2xl text-[17px] text-romolo-warm-gray leading-relaxed">
            Every cannoli that leaves our kitchen follows the same four-step
            process that Nonno Romolo perfected over six decades. No machines, no
            mass production — just patience and passion.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`group animate-on-scroll delay-${i + 1} transition-transform duration-500 ease-out hover:-translate-y-1`}
            >
              {/* Step image */}
              <div className="relative aspect-square mb-6 overflow-hidden rounded-sm ring-1 ring-white/70 shadow-lg shadow-romolo-charcoal/10 transition-shadow duration-500 ease-out group-hover:shadow-xl group-hover:shadow-romolo-charcoal/20">
                <Image
                  src={step.image}
                  alt={step.imageAlt}
                  fill
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Soft corner vignette */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, transparent 55%, rgba(26,26,26,0.18) 100%)",
                  }}
                />
                {step.personable && (
                  <div
                    className="absolute top-3 left-3 bg-romolo-red text-white text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-1 rounded-sm"
                    title="Closing visual must feel human — Aaron + customer at the counter"
                  >
                    New shot — w/ Aaron
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex items-start gap-4">
                <span className="font-[var(--font-serif)] text-6xl md:text-7xl font-light text-romolo-charcoal/15 leading-[0.8] shrink-0 tabular-nums transition-colors duration-500 group-hover:text-romolo-red/30">
                  {step.number}
                </span>
                <div className="pt-1">
                  <h3 className="font-[var(--font-serif)] text-xl md:text-2xl font-medium text-romolo-charcoal mb-2 transition-colors duration-500 group-hover:text-romolo-red">
                    {step.title}
                  </h3>
                  <p className="text-sm text-romolo-warm-gray leading-relaxed">
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
