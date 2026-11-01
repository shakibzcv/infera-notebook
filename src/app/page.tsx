import Link from 'next/link';

import HeroSection from '@/components/layout/hero-section';
import { FooterSection } from '@/components/layout/footer-section';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  FileText,
  Headphones,
  MessagesSquare,
  Presentation,
  Sparkles,
  Zap,
  Shield,
  Cloud,
  Users,
  CheckCircle2,
  ChevronDown,
  Github,
  Slack,
  BookOpen,
  HardDrive,
} from 'lucide-react';

/**
 * Use case cards data for the landing page.
 * Each card represents a primary target audience or workflow.
 */
const useCaseCards = [
  {
    title: 'Customer support co-pilot',
    description:
      'Unify policies, macros, transcripts and release notes so agents never leave the chat window.',
    bullets: [
      'Chat with every SOP, policy and prior ticket in context',
      'Publish verified FAQ collections that stay in sync',
    ],
    tag: 'Support',
    icon: MessagesSquare,
  },
  {
    title: 'Revenue & success desks',
    description:
      'Prep customer meetings with AI-written briefs, notes and slides sourced from the same uploads.',
    bullets: [
      'Generate deal or account insights in one click',
      'Spin up slides + follow-up notes with citations',
    ],
    tag: 'Revenue',
    icon: BarChart3,
  },
  {
    title: 'Ops & research teams',
    description:
      'Compare lengthy docs, interviews and spreadsheets to uncover trends and share narrated recaps.',
    bullets: [
      'Auto-tag insights across interviews or audits',
      'Send studio overviews with audio + visual context',
    ],
    tag: 'Operations',
    icon: FileText,
  },
  {
    title: 'Learning & enablement',
    description:
      'Build living notes, FAQ hubs and training decks that update whenever the source material changes.',
    bullets: [
      'Keep notes, FAQs and slides linked to the source',
      'Stream audio overviews for async onboarding',
    ],
    tag: 'Enablement',
    icon: Presentation,
  },
];

/**
 * Workflow steps for the landing page.
 * Outlines the core steps of using Infera Notebook.
 */
const workflowSteps = [
  {
    title: 'Upload anything',
    description:
      'Drag and drop PDFs, DOCX, PPTX, CSV, audio, video and URLs or sync from Drive, Notion and Slack.',
    meta: 'Files · Links · APIs',
  },
  {
    title: 'Organize context',
    description:
      'Group docs into collections, set permissions and let Notebook auto-tag entities and timelines.',
    meta: 'Collections · Spaces · Tags',
  },
  {
    title: 'Ask & iterate',
    description:
      'Chat, mention teammates, create notes, FAQs or action lists that stay linked to the original content.',
    meta: 'Chat · Notes · Tasks',
  },
  {
    title: 'Publish in one click',
    description:
      'Ship insights, FAQ hubs, slides and narrated studio overviews with citations you can share anywhere.',
    meta: 'Insights · FAQs · Slides · Studio',
  },
];

const insightHighlights = [
  {
    title: 'Insight coverage',
    metric: '82%',
    description: 'Questions answered without leaving the workspace.',
    detail: 'Grounded, cited responses for every stakeholder.',
    icon: Sparkles,
  },
  {
    title: 'FAQ builder',
    metric: '2 min',
    description: 'Average time to publish a verified FAQ article.',
    detail: 'Draft, review and push live from one screen.',
    icon: MessagesSquare,
  },
  {
    title: 'Studio overview',
    metric: '1 click',
    description: 'Generate narrated audio + slide recaps instantly.',
    detail: 'Share secure links or embed in status docs.',
    icon: Headphones,
  },
];

const features = [
  {
    title: 'Lightning-fast processing',
    description: 'Upload and process documents in seconds with our optimized AI pipeline.',
    icon: Zap,
  },
  {
    title: 'Enterprise-grade security',
    description: 'SOC 2 compliant with end-to-end encryption and granular access controls.',
    icon: Shield,
  },
  {
    title: 'Cloud-native architecture',
    description: 'Built for scale with automatic backups and 99.9% uptime guarantee.',
    icon: Cloud,
  },
  {
    title: 'Team collaboration',
    description: 'Real-time collaboration with mentions, comments, and shared workspaces.',
    icon: Users,
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head of Customer Success',
    company: 'TechFlow Inc.',
    content:
      'Notebook transformed how our support team works. We cut response time by 60% and our agents love having instant access to every policy and FAQ.',
    avatar: 'SC',
  },
  {
    name: 'Marcus Rodriguez',
    role: 'VP of Sales',
    company: 'GrowthCo',
    content:
      "The deal briefs and account insights are game-changers. We're closing more deals because we're always prepared with the right context.",
    avatar: 'MR',
  },
  {
    name: 'Dr. Emily Watson',
    role: 'Research Director',
    company: 'Innovate Labs',
    content:
      'Processing hundreds of research papers and interviews used to take weeks. Now we get comprehensive insights and summaries in hours.',
    avatar: 'EW',
  },
];

const integrations = [
  { name: 'Google Drive', icon: HardDrive },
  { name: 'Notion', icon: BookOpen },
  { name: 'Slack', icon: Slack },
  { name: 'GitHub', icon: Github },
];

const faqs = [
  {
    question: 'What file types does Infera Notebook support?',
    answer:
      'We support 50+ file types including PDFs, DOCX, PPTX, CSV, audio files (MP3, WAV), video files (MP4, MOV), images, and public URLs. You can also sync directly from Google Drive, Notion, and Slack.',
  },
  {
    question: 'How secure is my data?',
    answer:
      "Security is our top priority. We're SOC 2 Type II compliant with end-to-end encryption, granular access controls, and regular security audits. Your data is never used to train our models without explicit consent.",
  },
  {
    question: 'Can I collaborate with my team?',
    answer:
      'Yes! Notebook supports real-time collaboration with shared workspaces, mentions, comments, and version history. You can set permissions at the collection or document level.',
  },
  {
    question: 'How accurate are the AI-generated insights?',
    answer:
      'Every response includes citations linking back to the source material. Our models are fine-tuned for accuracy and you can review, edit, and verify all generated content before publishing.',
  },
  {
    question: 'Can I export my work?',
    answer:
      'Absolutely. Export FAQs as Markdown, PDF, or web widgets. Slides can be exported as PPTX, Google Slides, or PDF. Notes sync to Notion or can be exported as Markdown.',
  },
  {
    question: "What's included in the Studio overview?",
    answer:
      'Studio overviews include narrated audio walkthroughs with transcripts, visual slide decks, and secure shareable links. You can customize the narrative and set expiration dates for shared links.',
  },
];

/**
 * The Home component serves as the landing page for Infera Notebook.
 * It showcases the platform's value proposition, features, and use cases.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Main hero section with CTA */}
      <HeroSection />

      {/* Core features grid */}
      <section id="features" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.85rem]">
            Built for teams who demand more
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-base">
            Enterprise-ready features that scale with your team and keep your data secure.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="border-border/60 bg-card/40 relative flex flex-col rounded-2xl border p-6 text-left shadow-sm transition hover:border-foreground/40 dark:bg-card/20"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Target audience use cases */}
      <section
        id="use-cases"
        className="scroll-mt-24 bg-muted/30 mx-auto max-w-6xl px-6 py-20 lg:py-28"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Use cases
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.85rem]">
            Upload, chat and publish for every team
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-base">
            Whether you need instant answers, insight summaries, auto-generated FAQs, living notes,
            decks or a studio overview, Notebook keeps every output connected to the exact document
            it came from.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {useCaseCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="border-border/60 bg-card/40 relative flex h-full flex-col rounded-3xl border p-6 text-left shadow-sm transition hover:border-foreground/40 dark:bg-card/20"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <span>{card.tag}</span>
                  <span className="rounded-full bg-foreground/5 px-3 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground/80 dark:bg-white/5">
                    Infera Notebook
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Icon className="size-5 text-primary" />
                  <h3 className="text-2xl font-semibold">{card.title}</h3>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {card.description}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-foreground/80">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-1 size-1.5 rounded-full bg-linear-to-r from-[#9B99FE] to-[#2BC8B7]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed insights and workflow preview */}
      <section id="insights" className="scroll-mt-24 py-20 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Insights
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Every answer is cited, measurable and ready to publish
            </h2>
            <p className="text-muted-foreground mt-4 text-base">
              Notebook keeps the full lineage from upload → chat → FAQ → notes → slides → studio
              overview so you can prove where every insight was generated.
            </p>
            <div className="mt-8 grid gap-4">
              {insightHighlights.map((highlight) => {
                const Icon = highlight.icon;
                return (
                  <div
                    key={highlight.title}
                    className="border-border/50 rounded-2xl border bg-background/70 p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      <span>{highlight.title}</span>
                    </div>
                    <div className="mt-3 text-4xl font-semibold">{highlight.metric}</div>
                    <p className="text-muted-foreground mt-2 text-sm">{highlight.description}</p>
                    <span className="text-muted-foreground/70 mt-1 block text-xs">
                      {highlight.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="border-border/50 rounded-3xl border bg-background/80 p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-sm font-semibold tracking-[0.4em]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {step.description}
                </p>
                <span className="text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground/80">
                  {step.meta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer testimonials */}
      <section className="bg-muted/30 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Testimonials
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Trusted by teams across industries
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base">
              See how teams are transforming their workflows with Infera Notebook.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="border-border/50 rounded-2xl border bg-background/80 p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-muted-foreground text-sm">{testimonial.role}</div>
                    <div className="text-muted-foreground/70 text-xs">{testimonial.company}</div>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular integrations */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Integrations
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Works with the tools you already use
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base">
              Connect your existing workflows and sync data seamlessly across platforms.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div
                  key={integration.name}
                  className="border-border/50 flex items-center gap-3 rounded-xl border bg-background/50 px-6 py-4 shadow-sm transition hover:border-foreground/40 hover:shadow-md"
                >
                  <Icon className="size-6 text-muted-foreground" />
                  <span className="font-medium">{integration.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-muted/30 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base">
              Everything you need to know about Infera Notebook.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group border-border/50 rounded-2xl border bg-background/80 p-6 shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold">
                  <span>{faq.question}</span>
                  <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action section */}
      <section
        id="contact"
        className="scroll-mt-24 mx-auto max-w-4xl px-6 py-20 text-center lg:py-28"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Get Started
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Ready to transform your documents into interactive knowledge?
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base">
          Start creating notebooks, chat with your documents, and generate FAQs, notes, slides, and
          studio overviews. Join teams already using Infera Notebook to unlock insights from their
          content.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/sign-up">Get started free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="mailto:hello@infera.ai?subject=Infera%20Notebook%20Demo%20Request">
              Schedule a demo
            </Link>
          </Button>
        </div>
      </section>

      {/* Global footer */}
      <FooterSection />
    </main>
  );
}
