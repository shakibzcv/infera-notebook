import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { TextEffect } from '@/components/ui/text-effect';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { HeroHeader } from './header';

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring' as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const featureHighlights = [
  {
    title: 'Chat with any file',
    description: 'Drop PDFs, slides, emails or audio and start a grounded conversation in seconds.',
    items: [
      'Supports PDF, DOCX, PPTX, CSV, audio and public links',
      'Cited answers with page or timestamp references',
      'Shareable chat threads for teammates or clients',
    ],
    badge: 'Conversational',
    pill: 'Realtime',
  },
  {
    title: 'Insight layer',
    description: 'Summarize collections, spot themes and surface the metrics that matter.',
    items: [
      'Auto tagging, clustering and topic timelines',
      'Insight cards with key numbers and sentiment',
      'Pin highlights into reports or dashboards',
    ],
    badge: 'Insights',
    pill: 'Auto summaries',
  },
  {
    title: 'AI FAQ builder',
    description: 'Generate canonical answers and publish them as help-center ready articles.',
    items: [
      'Batch question generation from any corpus',
      'Review + edit mode with tracked changes',
      'Export to web widgets, PDF or Markdown',
    ],
    badge: 'FAQs',
    pill: 'Share-ready',
  },
  {
    title: 'Living notes',
    description: 'Turn any chat into collaborative notes that stay linked to the source material.',
    items: [
      'Multi-author blocks with version history',
      'Embed charts, media and code blocks',
      'Sync directly to Notion or your knowledge base',
    ],
    badge: 'Notes',
    pill: 'Collaborative',
  },
  {
    title: 'Slide generator',
    description: 'Create presentation-ready decks with branded layouts and speaker notes.',
    items: [
      'Outline or storyboard mode in one click',
      'Auto-themed slides that match your palette',
      'Export PPTX, Google Slides or PDF',
    ],
    badge: 'Slides',
    pill: 'Presentation',
  },
  {
    title: 'Studio overview',
    description: 'Give stakeholders a narrated walkthrough of everything the AI uncovered.',
    items: [
      'Audio and transcript overview with chapters',
      'Storyline mode for executive rollups',
      'Secure, expiring share links and embeds',
    ],
    badge: 'Studio',
    pill: 'Showtime',
  },
];

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: 'spring' as const,
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="mask-b-from-35% mask-b-to-90% absolute inset-0 top-56 -z-20 lg:top-32"
            >
              <Image
                src="https://ik.imagekit.io/lrigu76hy/tailark/night-background.jpg?updatedAt=1745733451120"
                alt="background"
                className="hidden size-full dark:block"
                width="3276"
                height="4095"
              />
            </AnimatedGroup>

            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"
            />

            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="#product"
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                  >
                    <span className="text-foreground text-sm">
                      Now supporting 50+ file & media types
                    </span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mx-auto mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]"
                >
                  Your docs, instantly chat-ready
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-balance text-lg"
                >
                  Upload any file, knowledge base or recording and let Infera Notebook answer
                  questions, build FAQs, generate notes, slides and narrated studio overviews with
                  citations you can trust.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={1}
                    className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5"
                  >
                    <Button asChild size="lg" className="rounded-xl px-5 text-base">
                      <Link href="/notebooks">
                        <span className="text-nowrap">Create your notebook</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5"
                  >
                    <Link href="#product">
                      <span className="text-nowrap">Explore workspace</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="mask-b-from-55% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  <Image
                    className="bg-background aspect-15/8 relative hidden rounded-2xl dark:block"
                    src="/demo/dark.png"
                    alt="Infera Notebook Workspace Dark Theme"
                    width="2700"
                    height="1440"
                    priority
                  />
                  <Image
                    className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden"
                    src="/demo/light.png"
                    alt="Infera Notebook Workspace Light Theme"
                    width="2700"
                    height="1440"
                    priority
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
        <section id="product" className="scroll-mt-24 bg-background pb-16 pt-16 md:pb-32">
          <div className="m-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Workspace outputs
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Everything after the upload happens in one place
              </h2>
              <p className="text-muted-foreground mt-4 text-base">
                Generate conversations, insights, FAQs, notes, slides and studio overviews from the
                same context-aware chat so your team never has to start from scratch again.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {featureHighlights.map((feature) => (
                <div
                  key={feature.title}
                  className="border-border/60 bg-card/40 hover:border-foreground/30 relative flex h-full flex-col rounded-2xl border p-6 shadow-sm transition-colors duration-200 dark:bg-card/20"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{feature.badge}</span>
                    <span className="rounded-full bg-foreground/5 px-3 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground/80 dark:bg-white/5">
                      {feature.pill}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm">{feature.description}</p>
                  <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 leading-relaxed">
                        <span className="mt-1 size-1.5 rounded-full bg-linear-to-r from-[#9B99FE] to-[#2BC8B7]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
