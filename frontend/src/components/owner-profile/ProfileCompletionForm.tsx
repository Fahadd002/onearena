/* components/owner-profile/ProfileCompletionForm.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '../common/FileUpload';
import { api } from '@/services/api.services';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Loader from '../common/Loader';

const profileSchema = z.object({
  // Step 1: Personal Info
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5,6}$/, 'Zip code must be 5-6 digits'),

  // Step 2: Business Info
  businessName: z.string().min(3, 'Business name is required'),
  businessRegistration: z.string().min(5, 'Business registration number required'),
  nid: z.string().regex(/^\d{10,13}$/, 'NID must be 10-13 digits'),
  tradeLicense: z.string().min(5, 'Trade license number required'),
  bankAccountName: z.string().min(2, 'Bank account name required'),
  bankAccountNumber: z.string().min(10, 'Bank account number required'),
  bankRoutingNumber: z.string().min(5, 'Routing number required'),

  // Step 3: Documents (file IDs)
  nidImageId: z.string().optional(),
  licenseImageId: z.string().optional(),
  registrationDocId: z.string().optional(),

  // Step 4: Subscription
  subscriptionPlanId: z.string().min(1, 'Please select a subscription plan'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),

  // Terms acceptance
  termsAccepted: z.boolean().refine((val) => val === true, 'You must accept terms and conditions'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileCompletionForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
  });

  // Fetch subscription plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/subscription-plans');
        if (response.data?.data) {
          setSubscriptionPlans(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription plans:', error);
      }
    };
    fetchPlans();
  }, []);

  const handleDocumentUpload = async (
    file: File,
    fieldName: 'nidImageId' | 'licenseImageId' | 'registrationDocId'
  ) => {
    try {
      setUploadingDocs(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'owner-documents');

      const uploadResponse = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadResponse.data?.data?.id) {
        form.setValue(fieldName, uploadResponse.data.data.id);
        toast.success('Document uploaded successfully');
      }
    } catch (error) {
      toast.error('Failed to upload document');
      console.error('Upload error:', error);
    } finally {
      setUploadingDocs(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);

      // Step 1: Update owner profile
      const profilePayload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        address: `${data.address}, ${data.city}, ${data.state} ${data.zipCode}`,
        businessName: data.businessName,
        businessRegistration: data.businessRegistration,
        nid: data.nid,
        tradeLicense: data.tradeLicense,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankRoutingNumber: data.bankRoutingNumber,
        nidImageId: data.nidImageId,
        licenseImageId: data.licenseImageId,
        registrationDocId: data.registrationDocId,
        verificationStatus: 'SUBMITTED',
      };

      const profileResponse = await api.patch('/owner-profile', profilePayload);
      
      if (!profileResponse.data?.success) {
        throw new Error('Failed to update profile');
      }

      // Step 2: Subscribe to plan
      const subscriptionPayload = {
        planId: data.subscriptionPlanId,
        billingCycle: data.billingCycle,
      };

      const subscriptionResponse = await api.post('/subscription/subscribe', subscriptionPayload);
      
      if (!subscriptionResponse.data?.success) {
        throw new Error('Failed to create subscription');
      }

      toast.success('Profile completed! Subscription activated with 30-day free trial.');
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete profile');
      console.error('Profile submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Info', description: 'Your basic information' },
    { number: 2, title: 'Business Info', description: 'Business and banking details' },
    { number: 3, title: 'Documents', description: 'Upload required documents' },
    { number: 4, title: 'Subscription', description: 'Choose your plan' },
    { number: 5, title: 'Review', description: 'Review and submit' },
  ];

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Let's get your owner account set up. This process takes about 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {steps.map((s) => (
                <div
                  key={s.number}
                  className={`flex flex-col items-center cursor-pointer ${
                    step >= s.number ? 'opacity-100' : 'opacity-50'
                  }`}
                  onClick={() => setStep(s.number)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                      step === s.number
                        ? 'bg-primary text-white'
                        : step > s.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {step > s.number ? '✓' : s.number}
                  </div>
                  <span className="text-sm font-medium">{s.title}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <Input
                      placeholder="John"
                      {...form.register('firstName')}
                      disabled={loading}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <Input
                      placeholder="Doe"
                      {...form.register('lastName')}
                      disabled={loading}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <Input
                      placeholder="0123456789"
                      {...form.register('phoneNumber')}
                      disabled={loading}
                    />
                    {form.formState.errors.phoneNumber && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <Controller
                      name="gender"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.gender && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.gender.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Street Address</label>
                  <Input
                    placeholder="123 Main Street"
                    {...form.register('address')}
                    disabled={loading}
                  />
                  {form.formState.errors.address && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <Input
                      placeholder="City"
                      {...form.register('city')}
                      disabled={loading}
                    />
                    {form.formState.errors.city && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <Input
                      placeholder="State"
                      {...form.register('state')}
                      disabled={loading}
                    />
                    {form.formState.errors.state && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.state.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Zip Code</label>
                    <Input
                      placeholder="12345"
                      {...form.register('zipCode')}
                      disabled={loading}
                    />
                    {form.formState.errors.zipCode && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.zipCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Business Information</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Name</label>
                  <Input
                    placeholder="My Awesome Turf"
                    {...form.register('businessName')}
                    disabled={loading}
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.businessName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">NID Number</label>
                    <Input
                      placeholder="1234567890123"
                      {...form.register('nid')}
                      disabled={loading}
                    />
                    {form.formState.errors.nid && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.nid.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Trade License</label>
                    <Input
                      placeholder="License number"
                      {...form.register('tradeLicense')}
                      disabled={loading}
                    />
                    {form.formState.errors.tradeLicense && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.tradeLicense.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Business Registration Number</label>
                  <Input
                    placeholder="Registration number"
                    {...form.register('businessRegistration')}
                    disabled={loading}
                  />
                  {form.formState.errors.businessRegistration && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.businessRegistration.message}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-4">Bank Account Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                      <Input
                        placeholder="Full name as per bank"
                        {...form.register('bankAccountName')}
                        disabled={loading}
                      />
                      {form.formState.errors.bankAccountName && (
                        <p className="text-red-500 text-sm mt-1">
                          {form.formState.errors.bankAccountName.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Account Number</label>
                        <Input
                          placeholder="1234567890"
                          {...form.register('bankAccountNumber')}
                          disabled={loading}
                        />
                        {form.formState.errors.bankAccountNumber && (
                          <p className="text-red-500 text-sm mt-1">
                            {form.formState.errors.bankAccountNumber.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Routing Number</label>
                        <Input
                          placeholder="Routing number"
                          {...form.register('bankRoutingNumber')}
                          disabled={loading}
                        />
                        {form.formState.errors.bankRoutingNumber && (
                          <p className="text-red-500 text-sm mt-1">
                            {form.formState.errors.bankRoutingNumber.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Upload Documents</h3>
                <Alert>
                  <AlertDescription>
                    Upload clear photos or scans of your documents. Files must be in JPG, PNG, or PDF format.
                  </AlertDescription>
                </Alert>

                <div>
                  <label className="block text-sm font-medium mb-2">NID / ID Document</label>
                  <FileUpload
                    onUpload={(file) => handleDocumentUpload(file, 'nidImageId')}
                    loading={uploadingDocs}
                    acceptedFormats={['jpg', 'png', 'pdf']}
                  />
                  {form.watch('nidImageId') && (
                    <p className="text-green-600 text-sm mt-2">✓ Document uploaded</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Trade License</label>
                  <FileUpload
                    onUpload={(file) => handleDocumentUpload(file, 'licenseImageId')}
                    loading={uploadingDocs}
                    acceptedFormats={['jpg', 'png', 'pdf']}
                  />
                  {form.watch('licenseImageId') && (
                    <p className="text-green-600 text-sm mt-2">✓ Document uploaded</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Business Registration Document</label>
                  <FileUpload
                    onUpload={(file) => handleDocumentUpload(file, 'registrationDocId')}
                    loading={uploadingDocs}
                    acceptedFormats={['jpg', 'png', 'pdf']}
                  />
                  {form.watch('registrationDocId') && (
                    <p className="text-green-600 text-sm mt-2">✓ Document uploaded</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Subscription */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Choose Your Subscription Plan</h3>
                <p className="text-sm text-gray-600 mb-4">All plans include 30 days free trial!</p>

                {subscriptionPlans.length === 0 ? (
                  <Loader />
                ) : (
                  <div className="space-y-4">
                    {subscriptionPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          form.watch('subscriptionPlanId') === plan.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => form.setValue('subscriptionPlanId', plan.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              ৳{' '}
                              {plan.prices.find((p: any) => p.period === 'MONTHLY')?.price || 'TBD'} /
                              month
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm font-medium">Max Turfs: {plan.maxTurfs}</p>
                          {plan.features && (
                            <ul className="text-sm text-gray-600 mt-1">
                              {plan.features.split(',').map((feature: string, idx: number) => (
                                <li key={idx}>• {feature.trim()}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Billing Cycle</label>
                  <Controller
                    name="billingCycle"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="MONTHLY"
                            checked={field.value === 'MONTHLY'}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={loading}
                          />
                          <span>Monthly</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="YEARLY"
                            checked={field.value === 'YEARLY'}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={loading}
                          />
                          <span>Yearly (Save 2 months!)</span>
                        </label>
                      </div>
                    )}
                  />
                  {form.formState.errors.billingCycle && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.billingCycle.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Review Your Information</h3>
                <Alert>
                  <AlertDescription>
                    Please review all information before submitting. Your profile will be sent for verification.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">
                      {form.watch('firstName')} {form.watch('lastName')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Business</p>
                    <p className="font-medium">{form.watch('businessName')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{form.watch('phoneNumber')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Plan</p>
                    <p className="font-medium">
                      {subscriptionPlans.find((p) => p.id === form.watch('subscriptionPlanId'))?.name}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 mb-4">
                    ✓ All documents uploaded and verified
                  </p>
                  <p className="text-sm text-gray-700">
                    ✓ Your account will start with a 30-day free trial
                  </p>
                </div>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    {...form.register('termsAccepted')}
                    disabled={loading}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    I agree to the <a href="#" className="text-primary underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-primary underline">Privacy Policy</a>
                  </span>
                </label>
                {form.formState.errors.termsAccepted && (
                  <p className="text-red-500 text-sm">{form.formState.errors.termsAccepted.message}</p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1 || loading}
              >
                Previous
              </Button>

              {step < 5 ? (
                <Button
                  type="button"
                  onClick={() => setStep(Math.min(5, step + 1))}
                  disabled={loading}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader /> : 'Complete Profile & Subscribe'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCompletionForm;
