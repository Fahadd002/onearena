"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Phone, Plus, X, Check, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { httpClient } from "@/lib/axios/httpClient";
import { validateBangladeshiMobile } from "@/lib/validators";
import { API_ENDPOINTS } from "@/lib/api/config";
import { formatFieldErrors } from "@/lib/form-errors";
import { getFileUrl } from "@/lib/utils";
import { turfZodSchema } from "@/zod/auth.validation";
import {
  assignTurfFacilitiesAction,
  createTurfAction,
  deleteTurfImageAction,
  uploadTurfImagesAction,
  updateTurfAction,
} from "../_actions";
import LocationPicker, { type TurfLocation } from "@/components/common/LocationPicker";

type TurfForm = {
  name: string;
  categoryId: string;
  description: string;
  address: string;
  defaultSlotPrice: string;
  defaultSlotDuration: string;
  latitude: string;
  longitude: string;
};

type PaymentNumberRow = { method: string; number: string };

const paymentOptions = [
  { id: "BKASH", name: "bKash", icon: "/marchent-icon/bKash.svg" },
  { id: "NAGAD", name: "Nagad", icon: "/marchent-icon/nagad.svg" },
  { id: "ROKET", name: "Rocket", icon: "/marchent-icon/rocket.svg" },
] as const;

type Facility = { id: string; name: string };
type TurfImageFile = { file: File; preview: string };
type EditTurf = {
  name: string;
  categoryId?: string;
  category?: { id?: string; name?: string };
  address: string;
  description?: string | null;
  defaultSlotPrice: string | number;
  defaultSlotDuration: number;
  allowAdvancePayment?: boolean;
  advancePaymentAmount?: number | string;
  paymentPhoneNumbers?: PaymentNumberRow[];
  latitude: string | number;
  longitude: string | number;
  facilities: Array<{ facility: { id: string } }>;
  images: Array<{ id: string; url: string }>;
};

const steps = ["Turf details", "Facilities", "Turf images"];

export function AdminTurfFormPage({ turfId }: { turfId?: string }) {
  const router = useRouter();
  const { options: categories, loading: categoriesLoading } = useCategoryOptions();

  const [step, setStep] = useState(0);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [images, setImages] = useState<TurfImageFile[]>([]);
  const [location, setLocation] = useState<TurfLocation | null>(null);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string }>>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [allowAdvancePayment, setAllowAdvancePayment] = useState(false);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState("");
  const [advancePaymentError, setAdvancePaymentError] = useState("");
  const [paymentRows, setPaymentRows] = useState<PaymentNumberRow[]>([]);
  const [paymentMobileErrors, setPaymentMobileErrors] = useState<string[]>([]);
  const submitIntent = useRef(false);

  const editQuery = useQuery({
    queryKey: ["turf-edit", turfId],
    enabled: !!turfId,
    queryFn: async () => {
      const response = await httpClient.get<EditTurf>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}`);
      const turf = response.data;
      return {
        ...turf,
        images: (turf.images ?? []).map((image) => ({
          ...image,
          url: getFileUrl(image.url) ?? image.url,
        })),
      };
    },
  });

  const { data: facilitiesResult, isLoading: facilitiesLoading } = useQuery({
    queryKey: ["turf-create-facilities"],
    queryFn: async () =>
      (
        await httpClient.get<{ data: Facility[] }>(API_ENDPOINTS.marketplace.facilities, {
          params: { page: "1", limit: "100", sortBy: "name", sortOrder: "asc" },
        })
      ).data,
  });
  const facilities = facilitiesResult?.data ?? [];
  const editCategoryId = editQuery.data?.categoryId || editQuery.data?.category?.id || "";
  const editCategoryOption = editCategoryId && !categories.some((option) => option.value === editCategoryId)
    ? { label: editQuery.data?.category?.name || "Current sport", value: editCategoryId }
    : null;
  const categoryOptions = editCategoryOption ? [...categories, editCategoryOption] : categories;

  const form = useForm({
    defaultValues: {
      name: "",
      categoryId: "",
      description: "",
      address: "",
      defaultSlotPrice: "",
      defaultSlotDuration: "60",
      latitude: "",
      longitude: "",
    },
    onSubmit: async ({ value }) => {
      setSaving(true);
      let createdTurfId: string | undefined;

      try {
        if (turfId) {
          for (const imageId of removedImageIds) {
            const deleteResult = await deleteTurfImageAction(imageId);
            if (!deleteResult.success) {
              throw new Error(deleteResult.message || "Could not delete turf image");
            }
          }
          const clearResult = await assignTurfFacilitiesAction(turfId, []);
          if (!clearResult.success) {
            throw new Error(clearResult.message || "Could not clear existing facilities");
          }
        }

        const defaultSlotPrice = Number(value.defaultSlotPrice);
        const advancePaymentAmountVal = Number(advancePaymentAmount) || 0;

        if (allowAdvancePayment && !advancePaymentAmountVal) {
          throw new Error("Advance payment amount is required");
        }

        if (allowAdvancePayment && advancePaymentAmountVal > defaultSlotPrice) {
          throw new Error("Advance payment amount cannot be greater than default slot price");
        }

        if (allowAdvancePayment && paymentRows.length === 0) {
          throw new Error("At least one payment method is required");
        }

        if (allowAdvancePayment && paymentMobileErrors.some(Boolean)) {
          throw new Error("Please fix invalid payment numbers");
        }

        const payload = {
          ...value,
          name: value.name.trim(),
          address: value.address.trim(),
          description: value.description.trim() || undefined,
          defaultSlotPrice,
          defaultSlotDuration: Number(value.defaultSlotDuration),
          allowAdvancePayment,
          advancePaymentAmount: advancePaymentAmountVal,
          paymentPhoneNumbers: allowAdvancePayment ? paymentRows : [],
          latitude: Number(value.latitude),
          longitude: Number(value.longitude),
        };

        const result = turfId
          ? await updateTurfAction(turfId, payload)
          : await createTurfAction(payload);

        if (!("data" in result)) {
          throw new Error(result.message);
        }

        const savedTurfId = turfId || (result.data as { id: string }).id;
        createdTurfId = turfId ? undefined : savedTurfId;

        if (selectedFacilities.length) {
          const facilitiesResult = await assignTurfFacilitiesAction(savedTurfId, selectedFacilities);
          if (!facilitiesResult.success) {
            throw new Error(facilitiesResult.message || "Could not save turf facilities");
          }
        }

        if (images.length) {
          const imagesResult = await uploadTurfImagesAction(
            savedTurfId,
            images.map(({ file }) => file)
          );
          if (!imagesResult.success) {
            throw new Error(imagesResult.message || "Could not save turf images");
          }
        }

        toast.success(turfId ? "Turf updated successfully" : "Turf submitted for review");
        router.push("/admin/dashboard/turfs");
      } catch (error: unknown) {
        if (createdTurfId) {
          try {
          } catch (cleanupError) {
            console.error("Could not roll back turf creation", cleanupError);
          }
        }
        toast.error(error instanceof Error ? error.message : "Could not save turf");
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!editQuery.data || categoriesLoading) return;
    const current = editQuery.data;

    form.setFieldValue("name", current.name);
    form.setFieldValue("description", current.description || "");
    form.setFieldValue("address", current.address);
    form.setFieldValue("defaultSlotPrice", String(current.defaultSlotPrice));
    form.setFieldValue("defaultSlotDuration", String(current.defaultSlotDuration));
    form.setFieldValue("latitude", String(current.latitude));
    form.setFieldValue("longitude", String(current.longitude));

    const apiCategoryId = current.categoryId || current.category?.id;
    let resolvedCategoryId = apiCategoryId || "";
    if (categories.length > 0) {
      const exactMatch = categories.find((opt) => opt.value === apiCategoryId);
      const nameMatch = categories.find(
        (opt) =>
          opt.label.trim().toLowerCase() === current.category?.name?.trim().toLowerCase()
      );
      const matched = exactMatch || nameMatch;
      if (matched) {
        resolvedCategoryId = matched.value;
      } else if (apiCategoryId) {
        console.warn(
          `Category with ID ${apiCategoryId} not found in dropdown options. ` +
          `This may happen if the category is archived or not visible.`
        );
        resolvedCategoryId = apiCategoryId;
      }
    }
    setSelectedCategoryId(resolvedCategoryId);
    form.setFieldValue("categoryId", resolvedCategoryId, { dontValidate: true });

    setAllowAdvancePayment(!!current.allowAdvancePayment);
    setAdvancePaymentAmount(String(current.advancePaymentAmount ?? ""));
    const existingRows = (current.paymentPhoneNumbers ?? []).slice(0, 3);
    setPaymentRows(existingRows);
    setPaymentMobileErrors(existingRows.map((row) => validateBangladeshiMobile(row.number) ?? ""));

    setLocation({
      address: current.address,
      latitude: Number(current.latitude),
      longitude: Number(current.longitude),
      city: "",
      district: "",
      country: "",
    });

    setSelectedFacilities(current.facilities.map(({ facility }) => facility.id));
    setExistingImages(current.images);
    setRemovedImageIds([]);
    setImages([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editQuery.data, categories, categoriesLoading]);

  useEffect(() => {
    return () => {
      images.forEach(({ preview }) => URL.revokeObjectURL(preview));
    };
  }, [images]);

  const validLocation = useCallback(
    (values: TurfForm) => turfZodSchema.safeParse(values).success,
    []
  );

  const handleLocationChange = useCallback((nextLocation: TurfLocation) => {
    setLocation(nextLocation);
    form.setFieldValue("latitude", nextLocation.latitude.toFixed(7));
    form.setFieldValue("longitude", nextLocation.longitude.toFixed(7));
  }, [form]);

  const field = (name: keyof TurfForm, label: string, type = "text") => (
    <form.Field
      name={name}
      validators={{
        onChange: ({ value }) => {
          const result = turfZodSchema.shape[name].safeParse(value);
          return result.success ? undefined : result.error.issues[0]?.message;
        },
      }}
    >
      {(control) => (
        <div className="space-y-1">
          <Label htmlFor={control.name} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </Label>
          <Input
            id={control.name}
            type={type}
            value={control.state.value}
            onChange={(event) => control.handleChange(event.target.value)}
            aria-invalid={!!control.state.meta.errors.length}
            className="h-9 text-sm"
          />
          {control.state.meta.errors.length > 0 && (
            <p className="text-[11px] text-destructive">
              {formatFieldErrors(control.state.meta.errors)}
            </p>
          )}
        </div>
      )}
    </form.Field>
  );

  const descriptionField = (
    <form.Field name="description" validators={{ onChange: turfZodSchema.shape.description }}>
      {(control) => (
        <div className="space-y-1">
          <Label htmlFor={control.name} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            About the venue <span className="font-normal opacity-70">(optional)</span>
          </Label>
          <textarea
            id={control.name}
            value={control.state.value}
            onChange={(event) => control.handleChange(event.target.value)}
            className="min-h-16 w-full rounded-md border border-input bg-background/60 px-3 py-1.5 text-sm resize-y"
          />
        </div>
      )}
    </form.Field>
  );

  if (turfId && editQuery.isLoading) {
    return (
      <section className="dashboard-section">
        <p className="dashboard-empty">Loading turf editor...</p>
      </section>
    );
  }

  if (turfId && !editQuery.data) {
    return (
      <section className="dashboard-section">
        <p className="dashboard-empty">Turf not found.</p>
      </section>
    );
  }

  return (
    <section className="dashboard-section space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Button
          variant="glass"
          size="icon"
          className="size-8 rounded-lg border-primary/20 shadow-sm transition-transform hover:-translate-y-0.5"
          asChild
        >
          <Link
            href={turfId ? `/admin/dashboard/turfs/${turfId}` : "/admin/dashboard/turfs"}
            aria-label="Back"
          >
            <ArrowLeft className="size-3.5" />
          </Link>
        </Button>
        <div className="leading-tight">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Venue management
          </p>
          <h1 className="text-base font-semibold">
            {turfId ? "Edit turf" : "Add a new turf"}
          </h1>
        </div>
      </div>

      {/* Compact stepper */}
      <div className="flex items-center gap-1">
        {steps.map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-1">
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${index < step
                ? "bg-primary text-primary-foreground"
                : index === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {index < step ? <Check className="size-2.5" /> : index + 1}
            </div>
            <span
              className={`hidden text-[11px] font-medium sm:block ${index === step ? "text-foreground" : "text-muted-foreground"
                }`}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <div className={`h-px flex-1 ${index < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!submitIntent.current || step !== 2) return;
          submitIntent.current = false;
          void form.handleSubmit();
        }}
      >
        <Card className="surface-card overflow-hidden">
          <CardContent className="p-0">
            <div className="space-y-3 p-4">
              {/* Step 0 */}
              {step === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <MapPin className="size-3.5" />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Location details</p>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {field("name", "Turf name")}
                    <form.Field
                      name="categoryId"
                      validators={{ onChange: turfZodSchema.shape.categoryId }}
                    >
                      {(control) => (
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sport</Label>
                          <Select
                            value={selectedCategoryId || (turfId ? editCategoryId : "") || control.state.value}
                            onValueChange={(value) => {
                              setSelectedCategoryId(value);
                              control.handleChange(value);
                            }}
                            disabled={categoriesLoading}
                          >
                            <SelectTrigger className="h-9 text-sm" aria-invalid={!!control.state.meta.errors.length}>
                              <SelectValue placeholder="Choose a sport" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {control.state.meta.errors.length > 0 && (
                            <p className="text-[11px] text-destructive">
                              {formatFieldErrors(control.state.meta.errors)}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>
                    <div className="sm:col-span-2">{field("address", "Full address")}</div>
                    {field("defaultSlotPrice", "Default slot price (৳)", "number")}
                    {field("defaultSlotDuration", "Default slot duration (min)", "number")}
                    <div className="sm:col-span-2">{descriptionField}</div>

                    {/* Advance payment */}
                    <div className="sm:col-span-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          id="allow-advance-payment"
                          type="checkbox"
                          checked={allowAdvancePayment}
                          onChange={(event) => {
                            setAllowAdvancePayment(event.target.checked);
                            if (!event.target.checked) setAdvancePaymentError("");
                          }}
                          className="size-3.5 rounded accent-primary"
                        />
                        <Label htmlFor="allow-advance-payment" className="text-xs font-medium cursor-pointer">
                          Allow advance payment
                        </Label>
                      </div>
                      {allowAdvancePayment && (
                        <div className="mt-2.5 space-y-2.5">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">Advance payment amount (৳)</Label>
                            <Input
                              type="number"
                              value={advancePaymentAmount}
                              onChange={(event) => {
                                const val = event.target.value;
                                setAdvancePaymentAmount(val);
                                const defaultSlotPriceVal = Number(form.state.values.defaultSlotPrice);
                                const amountVal = Number(val) || 0;
                                if (allowAdvancePayment && defaultSlotPriceVal > 0 && amountVal > defaultSlotPriceVal) {
                                  setAdvancePaymentError("Advance payment amount cannot be greater than default slot price");
                                } else if (allowAdvancePayment && defaultSlotPriceVal > 0 && !amountVal) {
                                  setAdvancePaymentError("Advance payment amount is required");
                                } else {
                                  setAdvancePaymentError("");
                                }
                              }}
                              className="h-8 text-sm"
                            />
                            {advancePaymentError && (
                              <p className="text-[11px] text-destructive mt-0.5">{advancePaymentError}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {paymentOptions.map((opt) => {
                              const isSelected = paymentRows.some((row) => row.method === opt.id);
                              return (
                                <button
                                  type="button"
                                  key={opt.id}
                                  className="flex cursor-pointer items-center transition-all duration-200"
                                  onClick={() => {
                                    if (isSelected) {
                                      setPaymentRows((rows) => rows.filter((row) => row.method !== opt.id));
                                      setPaymentMobileErrors((errors) => {
                                        const idx = paymentRows.findIndex((row) => row.method === opt.id);
                                        return errors.filter((_, i) => i !== idx);
                                      });
                                    } else if (paymentRows.length < 3) {
                                      setPaymentRows((rows) => [...rows, { method: opt.id, number: "" }]);
                                      setPaymentMobileErrors((errors) => [...errors, ""]);
                                    }
                                  }}
                                >
                                  <img
                                    src={opt.icon}
                                    alt={opt.name}
                                    className={`h-9 w-20 shrink-0 rounded-md transition-all duration-200 bg-white ${isSelected
                                      ? "drop-shadow-[0_0_8px_rgba(128,0,255,0.5)] scale-105"
                                      : "hover:scale-105"
                                      }`}
                                  />
                                </button>
                              );
                            })}
                            {paymentRows.length >= 3 && (
                              <span className="text-[10px] text-muted-foreground">Max 3</span>
                            )}
                          </div>
                          {paymentRows.map((row, index) => {
                            const opt = paymentOptions.find((o) => o.id === row.method);
                            if (!opt) return null;
                            const error = paymentMobileErrors[index];
                            return (
                              <div key={opt.id}>
                                <div className="relative">
                                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <Phone className="size-3.5" />
                                  </div>
                                  <Input
                                    type="tel"
                                    inputMode="tel"
                                    placeholder={`01XXXXXXXXX (${opt.name})`}
                                    value={row.number}
                                    onChange={(event) => {
                                      const val = event.target.value;
                                      setPaymentRows((rows) => rows.map((r, i) => (i === index ? { ...r, number: val } : r)));
                                      setPaymentMobileErrors((errors) =>
                                        errors.map((e, i) => (i === index ? validateBangladeshiMobile(val) ?? "" : e)),
                                      );
                                    }}
                                    aria-invalid={!!error}
                                    className="h-8 pl-8 pr-8 text-sm"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 -translate-y-1/2 right-1 size-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      setPaymentRows((rows) => rows.filter((_, i) => i !== index));
                                      setPaymentMobileErrors((errors) => errors.filter((_, i) => i !== index));
                                    }}
                                    aria-label={`Remove ${opt.name}`}
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                                {error && (
                                  <p className="text-[11px] text-destructive mt-0.5 pl-8">{error}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-border/50 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <MapPin className="size-3.5" />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Exact location</p>
                    </div>
                    <LocationPicker
                      value={location}
                      onChange={handleLocationChange}
                    />
                  </div>
                </div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="size-3.5" />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Facilities</p>
                  </div>
                  {facilitiesLoading ? (
                    <p className="text-[11px] text-muted-foreground">Loading facilities...</p>
                  ) : facilities.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No facilities have been created yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {facilities.map((facility) => {
                        const checked = selectedFacilities.includes(facility.id);
                        return (
                          <span
                            key={facility.id}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${checked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/50 text-foreground hover:border-primary/50"
                              }`}
                            onClick={() => {
                              if (checked) {
                                setSelectedFacilities((prev) => prev.filter((id) => id !== facility.id));
                              } else {
                                setSelectedFacilities((prev) => [...prev, facility.id]);
                              }
                            }}
                          >
                            {facility.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-3">
                  <label
                    htmlFor="turf-images"
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                      <Plus className="size-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-medium">
                      Choose {turfId ? "additional" : "turf"} images
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Up to 10 images · JPG, PNG, or WebP
                    </span>
                  </label>
                  <Input
                    id="turf-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      const remainingSlots = 10 - images.length;
                      const selected = files.slice(0, remainingSlots);
                      setImages((current) => [
                        ...current,
                        ...selected.map((file) => ({
                          file,
                          preview: URL.createObjectURL(file),
                        })),
                      ]);
                      event.target.value = "";
                    }}
                  />

                  {existingImages.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Current images</p>
                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                        {existingImages.map((image) => (
                          <div key={image.id} className="group relative overflow-hidden rounded-md border">
                            <img
                              src={image.url}
                              alt="Current turf"
                              className="aspect-square w-full object-cover"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute right-0.5 top-0.5 size-5 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => {
                                setExistingImages((current) =>
                                  current.filter(({ id }) => id !== image.id)
                                );
                                setRemovedImageIds((current) =>
                                  current.includes(image.id) ? current : [...current, image.id]
                                );
                              }}
                              aria-label="Remove current image"
                            >
                              <X className="size-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {images.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                        New images ({images.length})
                      </p>
                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                        {images.map(({ file, preview }, index) => (
                          <div key={`${file.name}-${index}`} className="group relative overflow-hidden rounded-md border">
                            <img
                              src={preview}
                              alt={`Turf image ${index + 1}`}
                              className="aspect-square w-full object-cover"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute right-0.5 top-0.5 size-5 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => {
                                URL.revokeObjectURL(preview);
                                setImages((current) => current.filter((_, i) => i !== index));
                              }}
                              aria-label="Remove image"
                            >
                              <X className="size-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!turfId && images.length === 0 && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      Add at least one clear image of the playing area.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
          {([values, isSubmitting]) => (
            <div className="mt-3 flex justify-between gap-2">
              <Button
                type="button"
                variant="glass"
                size="sm"
                className="h-8 px-3 text-xs border-border/70 shadow-sm transition-transform hover:-translate-y-0.5"
                onClick={() =>
                  step === 0
                    ? router.push(turfId ? `/admin/dashboard/turfs/${turfId}` : "/admin/dashboard/turfs")
                    : setStep((current) => current - 1)
                }
              >
                {step === 0 ? "Cancel" : (
                  <>
                    <ChevronLeft className="mr-1 size-3" />
                    Back
                  </>
                )}
              </Button>

              {step < 2 ? (
                <Button
                  type="button"
                  variant="hero"
                  size="sm"
                  className="h-8 px-3 text-xs shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
                  disabled={!validLocation(values)}
                  onClick={() => setStep((current) => current + 1)}
                >
                  Continue
                  <ChevronRight className="ml-1 size-3" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="hero"
                  size="sm"
                  className="h-8 min-w-32 px-3 text-xs shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
                  onClick={() => {
                    submitIntent.current = true;
                  }}
                  disabled={
                    saving ||
                    isSubmitting ||
                    !validLocation(values) ||
                    (!turfId && images.length === 0) ||
                    (allowAdvancePayment && !advancePaymentAmount) ||
                    (allowAdvancePayment && paymentRows.length === 0) ||
                    (allowAdvancePayment && paymentMobileErrors.some(Boolean))
                  }
                >
                  {saving || isSubmitting ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : null}
                  {saving || isSubmitting
                    ? "Saving..."
                    : turfId
                      ? "Save changes"
                      : "Submit"}
                </Button>
              )}
            </div>
          )}
        </form.Subscribe>
      </form>
    </section>
  );
}

export default function AdminNewTurfPage() {
  return <AdminTurfFormPage />;
}