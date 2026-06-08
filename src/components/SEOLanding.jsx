import LandingNav from "./landing/LandingNav";
import TechMarquee from "./landing/TechMarquee";
import ScrollReveal from "./landing/ScrollReveal";
import LandingBackdrop from "./landing/LandingBackdrop";
import SiteFooter from "./landing/SiteFooter";
import Pricing from "./landing/Pricing";
import FAQSnippet from "./landing/FAQSnippet";
import CTAFinal from "./landing/CTAFinal";
import { GeistSans } from "geist/font/sans";

export default function SEOLanding({ 
  title, 
  subtitle, 
  description, 
  content, 
  features,
  faq 
}) {
  return (
    <div className={`min-h-screen bg-[#050505] text-white selection:bg-white/20 ${GeistSans.className}`}>
      <LandingBackdrop />
      <LandingNav />
      
      <main className="relative pt-32 pb-20">
        <div className="container mx-auto px-6">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-xl md:text-2xl text-white/60 leading-relaxed mb-10">
                {subtitle}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="/" className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all transform hover:scale-105">
                  Analyze Repository
                </a>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="grid md:grid-cols-2 gap-12 mb-32 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">Comprehensive Code Intelligence</h2>
                <p className="text-lg text-white/60 leading-relaxed">
                  {description}
                </p>
                <ul className="space-y-4">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="aspect-square rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                 <div className="text-6xl font-mono opacity-20 group-hover:opacity-40 transition-opacity">
                    {"{ code: intelligence }"}
                 </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="prose prose-invert max-w-none mb-32">
              <div className="grid md:grid-cols-3 gap-8">
                {content.map((item, i) => (
                  <div key={i} className="p-8 rounded-3xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-xl font-semibold mb-4">{item.heading}</h3>
                    <p className="text-white/50 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <TechMarquee />
        
        <div className="container mx-auto px-6 py-20">
          <Pricing />
          <FAQSnippet customFaq={faq} />
          <CTAFinal />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
