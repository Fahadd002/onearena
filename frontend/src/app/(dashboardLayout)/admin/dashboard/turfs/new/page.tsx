"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { formatFieldErrors } from "@/lib/form-errors";
import { turfZodSchema } from "@/zod/auth.validation";
import {
  assignTurfFacilitiesAction,
  createTurfAction,
  deleteTurfAction,
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
  basePrice: string;
  slotMinutes: string;
  latitude: string;
  longitude: string;
};

type Facility = { id: string; name: string };
type TurfImageFile = { file: File; preview: string };
type EditTurf = {
  name: string;
  categoryId?: string;
  category?: { id?: string; name?: string };
  address: string;
  description?: string | null;
  basePrice: string | number;
  slotMinutes: number;
  latitude: string | number;
  longitude: string | number;
  facilities: Array<{ facility: { id: string } }>;
  images: Array<{ id: string; url: string }>;
};

const steps = ["Location & details", "Facilities", "Turf images"];

export function AdminTurfFormPage({ turfId }: { turfId?: string }) {
  const router = useRouter();
  const { options: categories, loading: categoriesLoading } = useCategoryOptions();

  // Wizard state
  const [step, setStep] = useState(0);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [images, setImages] = useState<TurfImageFile[]>([]);
  const [location, setLocation] = useState<TurfLocation | null>(null);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string }>>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const submitIntent = useRef(false);

  const editQuery = useQuery({
    queryKey: ["turf-edit", turfId],
    enabled: !!turfId,
    queryFn: async () =>
      (await httpClient.get<EditTurf>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}`)).data,
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
      basePrice: "",
      slotMinutes: "60",
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

        const payload = {
          ...value,
          name: value.name.trim(),
          address: value.address.trim(),
          description: value.description.trim() || undefined,
          basePrice: Number(value.basePrice),
          slotMinutes: Number(value.slotMinutes),
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
        createdTurfId = turfId ? undefined : savedTurfId; // for rollback in create mode

        if (selectedFacilities.length) {
          const facilitiesResult = await assignTurfFacilitiesAction(savedTurfId, selectedFacilities);
          if (!facilitiesResult.success) {
            throw new Error(facilitiesResult.message || "Could not save turf facilities");
          }
        }

        // 4. Upload new images
        if (images.length) {
          const imagesResult = await uploadTurfImagesAction(
            savedTurfId,
            images.map(({ file }) => file)
          );
          if (!imagesResult.success) {
            throw new Error(imagesResult.message || "Could not save turf images");
          }
        }

        // 5. Success
        toast.success(turfId ? "Turf updated successfully" : "Turf submitted for review");
        router.push("/admin/dashboard/turfs");
      } catch (error: unknown) {
        // Rollback only if we are in create mode and the turf was created
        if (createdTurfId) {
          try {
            await deleteTurfAction(createdTurfId);
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

    // Set basic fields
    form.setFieldValue("name", current.name);
    form.setFieldValue("description", current.description || "");
    form.setFieldValue("address", current.address);
    form.setFieldValue("basePrice", String(current.basePrice));
    form.setFieldValue("slotMinutes", String(current.slotMinutes));
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

    // Location
    setLocation({
      address: current.address,
      latitude: Number(current.latitude),
      longitude: Number(current.longitude),
      city: "",
      district: "",
      country: "",
    });

    // Facilities & images
    setSelectedFacilities(current.facilities.map(({ facility }) => facility.id));
    setExistingImages(current.images);
    setRemovedImageIds([]);
    setImages([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editQuery.data, categories, categoriesLoading]);

  // --- Revoke preview URLs on unmount ----------------------------------------
  useEffect(() => {
    return () => {
      images.forEach(({ preview }) => URL.revokeObjectURL(preview));
    };
  }, [images]);

  // --- Helper functions ------------------------------------------------------
  const validLocation = useCallback(
    (values: TurfForm) => turfZodSchema.safeParse(values).success,
    []
  );

  // --- Field renderer --------------------------------------------------------
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
        <div className="space-y-2">
          <Label htmlFor={control.name}>{label}</Label>
          <Input
            id={control.name}
            type={type}
            value={control.state.value}
            onChange={(event) => control.handleChange(event.target.value)}
            aria-invalid={!!control.state.meta.errors.length}
          />
          {control.state.meta.errors.length > 0 && (
            <p className="text-xs text-destructive">
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
        <div className="space-y-2">
          <Label htmlFor={control.name}>
            About the venue <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id={control.name}
            value={control.state.value}
            onChange={(event) => control.handleChange(event.target.value)}
            className="min-h-24 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm"
          />
        </div>
      )}
    </form.Field>
  );

  // --- Loading and error states ----------------------------------------------
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

  // --- Main render -----------------------------------------------------------
  return (
    <section className="dashboard-section max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="glass"
          size="icon"
          className="rounded-xl border-primary/20 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          asChild
        >
          <Link
            href={turfId ? `/admin/dashboard/turfs/${turfId}` : "/admin/dashboard/turfs"}
            aria-label="Back"
          >
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <p className="dashboard-meta">Venue management</p>
          <h1 className="dashboard-title mt-1">
            {turfId ? "Edit turf" : "Add a new turf"}
          </h1>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            Step {step + 1} of {steps.length}
          </span>
          <span className="text-muted-foreground">{steps[step]}</span>
        </div>
        <div className="flex gap-1.5" aria-label="Turf creation progress">
          {steps.map((label, index) => (
            <div
              key={label}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              title={label}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  index <= step ? "w-full bg-primary" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>
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
        <Card className="surface-card">
          <CardHeader className="px-4 py-3 sm:px-5">
            <CardTitle className="text-base">{steps[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
            {/* Step 0 */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("name", "Turf name")}
                  <form.Field
                    name="categoryId"
                    validators={{ onChange: turfZodSchema.shape.categoryId }}
                  >
                    {(control) => (
                      <div className="space-y-2">
                        <Label>Sport</Label>
                        <Select
                          value={selectedCategoryId || (turfId ? editCategoryId : "") || control.state.value}
                          onValueChange={(value) => {
                            setSelectedCategoryId(value);
                            control.handleChange(value);
                          }}
                          disabled={categoriesLoading}
                        >
                          <SelectTrigger aria-invalid={!!control.state.meta.errors.length}>
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
                          <p className="text-xs text-destructive">
                            {formatFieldErrors(control.state.meta.errors)}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>
                  {field("address", "Full address")}
                  {field("basePrice", "Starting price (৳)", "number")}
                  {field("slotMinutes", "Slot duration (minutes)", "number")}
                  <div className="sm:col-span-2">{descriptionField}</div>
                </div>

                {/* Location picker */}
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label>Exact location</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter the coordinates manually or share the owner&apos;s current location.
                      Both values are required.
                    </p>
                  </div>
                  <LocationPicker
                    value={location}
                    onChange={(nextLocation) => {
                      setLocation(nextLocation);
                      form.setFieldValue("latitude", nextLocation.latitude.toFixed(7));
                      form.setFieldValue("longitude", nextLocation.longitude.toFixed(7));
                    }}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {field("latitude", "Latitude", "number")}
                    {field("longitude", "Longitude", "number")}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {facilitiesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading facilities...</p>
                ) : facilities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No facilities have been created yet.</p>
                ) : (
                  facilities.map((facility) => (
                    <label
                      key={facility.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-secondary/40"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFacilities.includes(facility.id)}
                        onChange={() =>
                          setSelectedFacilities((current) =>
                            current.includes(facility.id)
                              ? current.filter((id) => id !== facility.id)
                              : [...current, facility.id]
                          )
                        }
                        className="size-4 accent-primary"
                      />
                      <span className="font-medium">{facility.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-5">
                  <Label
                    htmlFor="turf-images"
                    className="flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <Plus className="size-4" />
                    Choose {turfId ? "additional" : "turf"} images
                  </Label>
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
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Select up to 10 images. JPG, PNG, or WebP.
                  </p>
                </div>

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Current images
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {existingImages.map((image) => (
                        <div key={image.id} className="relative overflow-hidden rounded-lg border">
                          <img
                            src={image.url}
                            alt="Current turf"
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute right-2 top-2 size-8"
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
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New images */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {images.map(({ file, preview }, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <img src={preview} alt={`Turf image ${index + 1}`} className="size-16 rounded object-cover" />
                      <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          URL.revokeObjectURL(preview);
                          setImages((current) => current.filter((_, i) => i !== index));
                        }}
                        aria-label="Remove image"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {!turfId && (
                  <p className="text-xs text-muted-foreground">
                    Add at least one clear image of the playing area.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
          {([values, isSubmitting]) => (
            <div className="mt-5 flex justify-between gap-3">
              <Button
                type="button"
                variant="glass"
                className="border-border/70 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                onClick={() =>
                  step === 0
                    ? router.push(turfId ? `/admin/dashboard/turfs/${turfId}` : "/admin/dashboard/turfs")
                    : setStep((current) => current - 1)
                }
              >
                {step === 0 ? "Cancel" : (
                  <>
                    <ChevronLeft className="mr-2 size-4" />
                    Back
                  </>
                )}
              </Button>

              {step < 2 ? (
                <Button
                  type="button"
                  variant="hero"
                  className="shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl"
                  disabled={!validLocation(values)}
                  onClick={() => setStep((current) => current + 1)}
                >
                  Continue
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="hero"
                  className="min-w-40 shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl"
                  onClick={() => {
                    submitIntent.current = true;
                  }}
                  disabled={
                    saving ||
                    isSubmitting ||
                    !validLocation(values) ||
                    (!turfId && images.length === 0)
                  }
                >
                  {saving || isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {saving || isSubmitting
                    ? "Saving..."
                    : turfId
                    ? "Save changes"
                    : "Submit for review"}
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