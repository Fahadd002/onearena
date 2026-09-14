/* components/subscription/SubscriptionPlans.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap } from 'lucide-react';
import { api } from '@/services/api.services';
import { toast } from 'sonner';
import Loader from '../common/Loader';

interface Plan {
  id: string;
  name: string;
  description: string;
  maxTurfs: number;
  features: string;
  prices: Array<{ period: string; price: string }>;
  active: boolean;
}

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string, billingCycle: string) => void;
  showSubscribeButton?: boolean;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  showSubscribeButton = true,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState('MONTHLY');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscription-plans');
      if (response.data?.data) {
        setPlans(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedPlan(response.data.data[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to load subscription plans');
      console.error('Fetch plans error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    try {
      const response = await api.post('/subscription/subscribe', {
        planId: selectedPlan,
        billingCycle,
      });

      if (response.data?.success) {
        toast.success('Subscription activated! 30-day free trial started.');
        onSelectPlan?.(selectedPlan, billingCycle);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
      console.error('Subscribe error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-2 text-center">Choose Your Plan</h2>
        <p className="text-center text-gray-600">
          All plans include a 30-day free trial. No credit card required to start.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-6 py-2 rounded font-medium transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-6 py-2 rounded font-medium transition-all relative ${
              billingCycle === 'YEARLY'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <Badge variant="secondary" className="absolute -top-3 -right-2 text-xs">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const yearlyPrice =
            plan.prices.find((p) => p.period === 'YEARLY')?.price || 
            (parseInt(plan.prices[0]?.price || '0') * 12 * 0.8).toString();
          const monthlyPrice = plan.prices.find((p) => p.period === 'MONTHLY')?.price;
          const currentPrice = billingCycle === 'YEARLY' ? yearlyPrice : monthlyPrice;

          return (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary border-2 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {/* Popular Badge */}
              {plan.maxTurfs >= 5 && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-orange-400 to-red-500">
                    <Zap className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4 pt-4 border-t">
                  <div className="text-3xl font-bold">
                    ৳ {currentPrice}
                    <span className="text-lg text-gray-600">/mo</span>
                  </div>
                  {billingCycle === 'YEARLY' && (
                    <p className="text-sm text-green-600 mt-1">Billed annually</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Main Feature */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">
                    Up to {plan.maxTurfs} Turfs
                  </p>
                </div>

                {/* Features List */}
                <ul className="space-y-2">
                  {plan.features?.split(',').map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature.trim()}</span>
                    </li>
                  ))}
                </ul>

                {/* Trial Info */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-900 font-medium">
                    ✓ 30-day free trial included
                  </p>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="text-center py-2 text-primary font-semibold">
                    ✓ Selected
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subscribe Button */}
      {showSubscribeButton && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubscribe}
            disabled={!selectedPlan}
            className="px-8 py-6 text-lg"
          >
            Start Free Trial
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlans;
