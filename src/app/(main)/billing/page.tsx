'use client';

import { CustomTextLogo } from '@/components/layout/logo';
import { ModeToggle } from '@/components/theme/mode-toggle';
import { UserButtonSimpleTheme } from '@/components/user/user-button-simple-theme';
import { CreditBadge } from '@/components/user/credit-badge';
import { Button } from '@/components/ui/button';
import { Check, ShieldAlert, Zap, Trophy, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_CREDITS } from '@/lib/constants';

/**
 * BillingPage component.
 * Displays various subscription plans (Free, Pro, Enterprise) and features.
 * Currently, it serves as a showcase for future monetization options.
 */
export default function BillingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full bg-background/50 backdrop-blur-md px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex items-center justify-between">
          <CustomTextLogo />
          <div className="flex items-center gap-4">
            <CreditBadge className="hidden sm:flex" />
            <ModeToggle />
            <UserButtonSimpleTheme afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Choice of Power</h1>
            <p className="max-w-xl mx-auto text-muted-foreground text-sm leading-relaxed">
              Unlock the full potential of Infera with advanced capabilities tailored to your
              research and development needs.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Standard Free */}
            <PlanCard
              name="Standard Free"
              price="$0"
              description="Ideal for students and individual researchers."
              icon={<Zap className="h-5 w-5 text-primary" />}
              features={[
                `${DEFAULT_CREDITS} Daily AI Credits`,
                'Basic document analysis',
                'Standard response speed',
                'Community support',
                'Standard cloud storage',
                'Mobile app sync',
              ]}
              isCurrent={true}
            />

            {/* Pro Specialist */}
            <PlanCard
              name="Pro Specialist"
              price="$20"
              period="/ month"
              description="Best for power users and professionals."
              icon={<Trophy className="h-5 w-5 text-amber-500" />}
              features={[
                'Everything in Free, plus:',
                'Unlimited AI Credits',
                'Priority model access',
                'Advanced research tools',
                '10GB Cloud storage',
                'Priority email support',
                'Early access to beta features',
              ]}
              isCurrent={false}
              showUnavailable={true}
            />

            {/* Enterprise Elite */}
            <PlanCard
              name="Enterprise Elite"
              price="Custom"
              description="Tailored solutions for teams and organizations."
              icon={<Building2 className="h-5 w-5 text-blue-500" />}
              features={[
                'Everything in Pro, plus:',
                'Custom credit limits',
                'Dedicated database',
                'API access for teams',
                'SSO & SAML integration',
                'SOC2 Compliance reports',
                '24/7 Dedicated manager',
              ]}
              isCurrent={false}
              showUnavailable={true}
            />
          </div>

          <div className="pt-10 flex flex-col items-center gap-6 border-t border-border/50">
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Secure payments by Stripe
              </p>
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Cancel subscription anytime
              </p>
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Priority processing included
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60 max-w-2xl text-center leading-relaxed">
              Transactions are processed securely. Subscriptions auto-renew until cancelled. Pricing
              shown is in USD. For specific institutional requirements or volume discounts, please
              contact our sales department.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * PlanCard component.
 * Renders a single subscription plan with its price, features, and a CTA button.
 *
 * @param props - Plan details including name, price, description, etc.
 */
function PlanCard({
  name,
  price,
  period,
  description,
  features,
  isCurrent,
  showUnavailable,
  icon,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  isCurrent?: boolean;
  showUnavailable?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col p-8 transition-all duration-300',
        isCurrent
          ? 'bg-primary/5 rounded-[2.5rem] border-2 border-primary/20'
          : 'bg-muted/10 rounded-[2.5rem] border border-border/40 hover:border-border/80'
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-tight shadow-sm">
          Active Plan
        </div>
      )}

      <div className="space-y-6 flex-1">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-xl font-bold">{name}</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed min-h-[2.5rem]">
            {description}
          </p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">{price}</span>
          {period && <span className="text-sm text-muted-foreground font-medium">{period}</span>}
        </div>

        <div className="h-px bg-border/40 w-full" />

        <ul className="space-y-4">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check
                className={cn(
                  'h-4 w-4 mt-0.5 shrink-0',
                  i === 0 && !isCurrent && feature.includes('Everything')
                    ? 'text-primary font-bold'
                    : 'text-primary/60'
                )}
              />
              <span
                className={cn(
                  'text-[13px] leading-tight',
                  i === 0 && !isCurrent && feature.includes('Everything')
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 space-y-4">
        {isCurrent ? (
          <Button
            disabled
            className="w-full h-12 rounded-2xl bg-primary/20 text-primary border-0 font-bold text-sm"
          >
            Current Plan
          </Button>
        ) : (
          <div className="space-y-3">
            <Button
              disabled
              className="w-full h-12 rounded-2xl bg-foreground/5 text-muted-foreground transition-all font-bold text-sm"
            >
              Upgrade Plan
            </Button>
            {showUnavailable && (
              <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80 font-medium">
                <ShieldAlert className="h-3 w-3" />
                This feature is not available right now
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
