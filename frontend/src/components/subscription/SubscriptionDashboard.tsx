/* components/subscription/SubscriptionDashboard.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Calendar, CheckCircle2, Clock, Zap } from 'lucide-react';
import { api } from '@/services/api.services';
import { toast } from 'sonner';
import Loader from '../common/Loader';

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  trialStart: string;
  trialEnd: string;
  isTrialUsed: boolean;
  billingCycle: string;
  autoRenew: boolean;
  plan: {
    name: string;
    maxTurfs: number;
    description: string;
    prices: Array<{ period: string; price: string }>;
  };
}

interface TurfCount {
  used: number;
  limit: number;
}

interface SubscriptionApiResponse {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  trialStart: string;
  trialEnd: string;
  isTrialUsed: boolean;
  billingCycle: string;
  autoRenew: boolean;
  plan: {
    name: string;
    maxTurfs: number;
    description: string;
    prices: Array<{ period: string; price: string }>;
  };
}

interface SubscriptionDashboardProps {
  onUpgrade?: () => void;
  onCancel?: () => void;
}

export const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  onUpgrade,
  onCancel,
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [turfCount, setTurfCount] = useState<TurfCount>({ used: 0, limit: 0 });
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchTurfCount();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.get<SubscriptionApiResponse>('/subscription');
      if (response.data) {
        setSubscription(response.data);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load subscription');
      }
      console.error('Fetch subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTurfCount = async () => {
    try {
      const response = await api.get<Array<{ id: string }>>('/turfs?limit=1');
      if (response.data) {
        setTurfCount({
          used: response.data.length,
          limit: 5, // Will be replaced by actual limit from backend
        });
      }
    } catch (error) {
      console.error('Fetch turf count error:', error);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to create new turfs.')) {
      return;
    }

    try {
      setCanceling(true);
      const response = await api.patch<{ success: boolean }>('/subscription/cancel', {});
      if (response.success) {
        toast.success('Subscription cancelled');
        fetchSubscription();
        onCancel?.();
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TRIAL':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRING':
        return 'bg-orange-100 text-orange-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TRIAL':
        return <Zap className="w-4 h-4" />;
      case 'ACTIVE':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'EXPIRING':
        return <AlertTriangle className="w-4 h-4" />;
      case 'EXPIRED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            You don't have an active subscription. Complete your profile to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onUpgrade}>View Plans & Subscribe</Button>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = getDaysRemaining(subscription.endDate);
  const isExpiringSoon = daysRemaining <= 7 && subscription.status !== 'EXPIRED';
  const currentPrice = subscription.plan.prices.find(
    (p) => p.period === subscription.billingCycle
  );

  return (
    <div className="space-y-6">
      {/* Main Subscription Card */}
      <Card className={subscription.status === 'EXPIRING' ? 'border-orange-200' : ''}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{subscription.plan.name}</CardTitle>
              <CardDescription>{subscription.plan.description}</CardDescription>
            </div>
            <Badge className={getStatusColor(subscription.status)}>
              {getStatusIcon(subscription.status)}
              <span className="ml-2">{subscription.status}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Trial Status */}
          {subscription.status === 'TRIAL' && (
            <Alert className="bg-blue-50 border-blue-200">
              <Zap className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong>Free Trial Active!</strong> You have {daysRemaining} days remaining in your
                free trial. Your subscription will automatically start after the trial ends.
              </AlertDescription>
            </Alert>
          )}

          {/* Expiring Soon Alert */}
          {isExpiringSoon && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <strong>Subscription Expiring Soon!</strong> Your subscription expires in {daysRemaining} days.
                Please renew to continue using our services.
              </AlertDescription>
            </Alert>
          )}

          {/* Subscription Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Billing Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Billing Information</h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Plan Type</span>
                  <span className="font-medium">{subscription.billingCycle}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Monthly Price</span>
                  <span className="font-medium">৳ {currentPrice?.price}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Auto-Renewal</span>
                  <span className={`font-medium ${subscription.autoRenew ? 'text-green-600' : 'text-red-600'}`}>
                    {subscription.autoRenew ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-medium">{formatDate(subscription.startDate)}</span>
                </div>
              </div>
            </div>

            {/* Subscription Timeline */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Timeline</h4>

              <div className="space-y-3">
                {subscription.isTrialUsed && (
                  <>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Trial Period</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(subscription.trialStart)} - {formatDate(subscription.trialEnd)}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {subscription.status === 'TRIAL' ? 'Active Period' : 'Current Period'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Days Remaining: {Math.max(0, daysRemaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Turf Usage */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-4">Turf Usage</h4>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {turfCount.used} of {subscription.plan.maxTurfs} Turfs Created
              </span>
              <Badge variant={turfCount.used >= subscription.plan.maxTurfs ? 'destructive' : 'secondary'}>
                {Math.round((turfCount.used / subscription.plan.maxTurfs) * 100)}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  turfCount.used >= subscription.plan.maxTurfs ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((turfCount.used / subscription.plan.maxTurfs) * 100, 100)}%` }}
              />
            </div>
            {turfCount.used >= subscription.plan.maxTurfs && (
              <p className="text-sm text-red-600 mt-2">
                You've reached your turf limit. Upgrade your plan to create more turfs.
              </p>
            )}
          </div>

          {/* Plan Features */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-4">Plan Features</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Create up to {subscription.plan.maxTurfs} turfs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Full booking management</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Revenue analytics dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Commission tracking</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {subscription.status !== 'EXPIRED' && subscription.status !== 'CANCELLED' && (
              <>
                <Button variant="outline" onClick={onUpgrade} className="flex-1">
                  Upgrade Plan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={canceling}
                >
                  {canceling ? <Loader /> : 'Cancel Subscription'}
                </Button>
              </>
            )}

            {(subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') && (
              <Button onClick={onUpgrade} className="w-full">
                Reactivate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Renewal Notice */}
      {subscription.autoRenew && subscription.status !== 'EXPIRED' && subscription.status !== 'CANCELLED' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Auto-Renewal Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Your subscription will automatically renew on {formatDate(subscription.endDate)}. If you wish to
              disable auto-renewal or cancel your subscription, you can do so anytime from this dashboard.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
