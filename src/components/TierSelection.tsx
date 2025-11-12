import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';

type FeatureTier = 'basic' | 'enhanced' | 'premium';

interface TierSelectionProps {
  selectedTier: FeatureTier;
  onTierSelect: (tier: FeatureTier) => void;
}

export const TierSelection = ({ selectedTier, onTierSelect }: TierSelectionProps) => {
  const tiers = [
    {
      id: 'basic' as FeatureTier,
      name: 'Basic',
      price: '₹50',
      icon: Sparkles,
      description: 'Essential lab analysis',
      features: [
        'AI-powered lab report analysis',
        'Abnormal values identification',
        'Basic health insights',
        'Download PDF report'
      ],
      color: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-200'
    },
    {
      id: 'enhanced' as FeatureTier,
      name: 'Enhanced',
      price: '₹100',
      icon: Zap,
      description: 'Advanced analysis with optional chat',
      features: [
        'Everything in Basic',
        'Optional clinical chat assessment',
        'Detailed health recommendations',
        'Lifestyle & diet guidance',
        'Risk factor analysis'
      ],
      color: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-200',
      popular: true
    },
    {
      id: 'premium' as FeatureTier,
      name: 'Premium',
      price: '₹100',
      icon: Crown,
      description: 'Complete integrated experience',
      features: [
        'Everything in Enhanced',
        'Mandatory clinical chat assessment',
        '10-year risk projections',
        'Personalized health dashboard',
        'Priority support'
      ],
      color: 'from-amber-500 to-orange-500',
      borderColor: 'border-amber-200'
    }
  ];

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-poppins font-semibold text-navy">
          Choose Your Analysis Tier
        </h3>
        <p className="text-slate text-sm">
          Select the level of analysis you need for your report
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isSelected = selectedTier === tier.id;

          return (
            <Card
              key={tier.id}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected
                  ? `ring-2 ring-primary shadow-lg scale-105 ${tier.borderColor}`
                  : 'hover:scale-102'
              }`}
              onClick={() => onTierSelect(tier.id)}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${tier.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-poppins">{tier.name}</CardTitle>
                <div className="text-3xl font-bold text-navy mt-2">{tier.price}</div>
                <CardDescription className="text-xs mt-1">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate">{feature}</span>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <Badge variant="outline" className="w-full justify-center border-primary text-primary">
                      Selected
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-xs text-slate/60 pt-2">
        Payment collection temporarily disabled. All tiers available for testing.
      </div>
    </div>
  );
};
