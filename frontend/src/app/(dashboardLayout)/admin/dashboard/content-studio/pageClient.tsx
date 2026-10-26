"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  ImagePlus,
  Info,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Pin,
  Plus,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import {
  TableEmptyState,
  TableLoadingState,
} from "@/components/common/TableStates";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { cn, getFileUrl } from "@/lib/utils";

import {
  ANNOUNCEMENT_TYPES,
  PLATFORM_OPTIONS,
  emptyAbout,
  emptyAnnouncement,
  emptyBlog,
  emptyContact,
  emptyFaq,
  emptyHero,
  emptySocial,
  slugify,
  toPreview,
  type AboutForm,
  type Announcement,
  type AnnouncementForm,
  type Blog,
  type BlogForm,
  type ContactForm,
  type ContentStudioData,
  type FaqForm,
  type FaqItem,
  type GalleryItem,
  type HeroForm,
  type SocialForm,
  type SocialLink,
} from "./_types";
import { FormField, RowActions, StatusPill } from "./_components/EditorParts";
import { ImagePicker } from "./_components/ImagePicker";
import { LandingPreview } from "./_components/LandingPreview";

const base = API_ENDPOINTS.marketplace.ownerContent;

// Bangladeshi mobile: exactly 11 digits starting with 01 (operator 013-019).
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

const validateContactNumber = (v: string) =>
  v
    ? BD_PHONE_RE.test(v.trim())
      ? null
      : "Enter a valid 11-digit number (e.g. 01712345678)"
    : null;

// ─────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────

type TabKey =
  | "hero"
  | "about"
  | "gallery"
  | "stories"
  | "faq"
  | "notices"
  | "contact"
  | "social";

const TABS: {
  key: TabKey;
  label: string;
  icon: typeof Sparkles;
  description: string;
}[] = [
  {
    key: "hero",
    label: "Hero",
    icon: Sparkles,
    description: "First thing visitors see — headline and cover image.",
  },
  {
    key: "about",
    label: "About",
    icon: Info,
    description: "Your story and a supporting image.",
  },
  {
    key: "gallery",
    label: "Gallery",
    icon: ImagePlus,
    description: "Photos that show off your venue.",
  },
  {
    key: "stories",
    label: "Stories",
    icon: Newspaper,
    description: "Long-form articles and updates.",
  },
  {
    key: "faq",
    label: "FAQ",
    icon: HelpCircle,
    description: "Common questions answered.",
  },
  {
    key: "notices",
    label: "Notices",
    icon: Bell,
    description: "Short announcements for visitors.",
  },
  {
    key: "contact",
    label: "Contact",
    icon: Phone,
    description: "How customers reach you.",
  },
  {
    key: "social",
    label: "Social",
    icon: Link2,
    description: "Links to your social profiles.",
  },
];

// ─────────────────────────────────────────────────────────────

export default function ContentStudioPage({
  initialData,
  ownerName,
  companyName,
  businessLogo,
  isVerified,
  profileContactNumber,
  profileBusinessEmail,
  profileAddress,
}: {
  initialData: ContentStudioData;
  ownerName: string;
  companyName: string | null;
  businessLogo: string | null;
  isVerified: boolean;
  profileContactNumber: string | null;
  profileBusinessEmail: string | null;
  profileAddress: string | null;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("hero");

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["owner-content"] });
  };

  // ─── HERO (no CTA) ───
  const [hero, setHero] = useState<HeroForm>(() => ({
    headline: initialData.hero?.headline ?? emptyHero.headline,
    subheadline: initialData.hero?.subheadline ?? emptyHero.subheadline,
    coverImage: initialData.hero?.coverImage ?? emptyHero.coverImage,
    overlayOpacity: initialData.hero?.overlayOpacity ?? emptyHero.overlayOpacity,
    textAlign: initialData.hero?.textAlign ?? emptyHero.textAlign,
    isVisible: initialData.hero?.isVisible ?? emptyHero.isVisible,
  }));
  const [heroCoverFile, setHeroCoverFile] = useState<File[]>([]);

  // ─── ABOUT ───
  const [about, setAbout] = useState<AboutForm>(() => ({
    heading: initialData.about?.heading ?? emptyAbout.heading,
    body: initialData.about?.body ?? emptyAbout.body,
    imageUrl: initialData.about?.imageUrl ?? emptyAbout.imageUrl,
    isVisible: initialData.about?.isVisible ?? emptyAbout.isVisible,
  }));
  const [aboutImage, setAboutImage] = useState<File[]>([]);

  // ─── CONTACT (no websiteUrl, no mapEmbedUrl) ───
  const [contact, setContact] = useState<ContactForm>(() => ({
    heading: initialData.contact?.heading ?? emptyContact.heading,
    phone: initialData.contact?.phone ?? profileContactNumber ?? emptyContact.phone,
    email: initialData.contact?.email ?? profileBusinessEmail ?? emptyContact.email,
    address: initialData.contact?.address ?? profileAddress ?? emptyContact.address,
    openingHours: initialData.contact?.openingHours ?? emptyContact.openingHours,
    isVisible: initialData.contact?.isVisible ?? emptyContact.isVisible,
  }));
  const [contactError, setContactError] = useState<string | null>(null);

  // ─── FAQ ───
  const [faqForm, setFaqForm] = useState<FaqForm>(emptyFaq);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  // ─── GALLERY ───
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);

  // ─── BLOG ───
  const [blog, setBlog] = useState<BlogForm>(emptyBlog);
  const [blogCover, setBlogCover] = useState<File[]>([]);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState(false);

  // ─── ANNOUNCEMENT ───
  const [announcement, setAnnouncement] =
    useState<AnnouncementForm>(emptyAnnouncement);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(
    null,
  );

  // ─── SOCIAL ───
  const [social, setSocial] = useState<SocialForm>(emptySocial);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<{
    kind:
      | "gallery"
      | "blog"
      | "faq"
      | "announcement"
      | "social"
      | "hero"
      | "about"
      | "contact";
    id: string;
    label: string;
  } | null>(null);

  // ─── Queries ───
  const { data: faqs = [] } = useQuery({
    queryKey: ["owner-content", "faqs"],
    queryFn: async () =>
      (await httpClient.get<FaqItem[]>(`${base}/faqs`)).data ?? [],
    initialData: initialData.faqs,
  });

  const { data: gallery = [], isLoading: galleryLoading } = useQuery({
    queryKey: ["owner-content", "gallery"],
    queryFn: async () =>
      (await httpClient.get<GalleryItem[]>(`${base}/gallery`)).data ?? [],
    initialData: initialData.gallery,
  });

  const { data: blogs = [], isLoading: blogsLoading } = useQuery({
    queryKey: ["owner-content", "blogs"],
    queryFn: async () =>
      (await httpClient.get<Blog[]>(`${base}/blogs`)).data ?? [],
    initialData: initialData.blogs,
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["owner-content", "announcements"],
    queryFn: async () =>
      (await httpClient.get<Announcement[]>(`${base}/announcements`)).data ?? [],
    initialData: initialData.announcements,
  });

  const { data: socialLinks = [], isLoading: socialLoading } = useQuery({
    queryKey: ["owner-content", "social"],
    queryFn: async () =>
      (await httpClient.get<SocialLink[]>(`${base}/social-links`)).data ?? [],
    initialData: initialData.social,
  });

  // ─── Mutations ───
  const saveMutation = useMutation({
    mutationFn: (request: Promise<unknown>) => request,
    onSuccess: () => {
      invalidateAll();
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  // ─── Preview data (live) ───
  const previewData: ContentStudioData = {
    hero: hero.headline
      ? {
          headline: hero.headline,
          subheadline: hero.subheadline || null,
          coverImage: hero.coverImage || null,
          overlayOpacity: hero.overlayOpacity,
          textAlign: hero.textAlign,
          isVisible: hero.isVisible,
        }
      : null,
    about: about.body
      ? {
          heading: about.heading,
          body: about.body,
          imageUrl: about.imageUrl || null,
          isVisible: about.isVisible,
        }
      : null,
    contact:
      contact.phone || contact.email || contact.address
        ? {
            heading: contact.heading,
            phone: contact.phone || null,
            email: contact.email || null,
            address: contact.address || null,
            openingHours: contact.openingHours || null,
            isVisible: contact.isVisible,
          }
        : null,
    faqs,
    gallery,
    blogs,
    announcements,
    social: socialLinks,
  };

  // ─── HERO handlers ───
  const saveHero = async () => {
    if (!hero.headline.trim()) return toast.error("Headline is required");

    let coverUrl = hero.coverImage;
    if (heroCoverFile.length) {
      const form = new FormData();
      form.append("file", heroCoverFile[0]);
      const res = await httpClient.post<{ url: string }>(
        `${base}/upload-image`,
        form,
      );
      coverUrl = res.data?.url ?? "";
    }

    saveMutation.mutate(
      httpClient.put(`${base}/hero`, {
        headline: hero.headline.trim(),
        subheadline: hero.subheadline || undefined,
        coverImage: coverUrl || undefined,
        overlayOpacity: hero.overlayOpacity,
        textAlign: hero.textAlign,
        isVisible: hero.isVisible,
      }),
    );
    setHero((prev) => ({ ...prev, coverImage: coverUrl }));
    setHeroCoverFile([]);
  };

  const deleteHero = () => {
    saveMutation.mutate(httpClient.delete(`${base}/hero`));
    setHero(emptyHero);
    setDeleting(null);
  };

  // ─── ABOUT handlers ───
  const saveAbout = async () => {
    if (!about.body.trim()) return toast.error("Body is required");

    let imgUrl = about.imageUrl;
    if (aboutImage.length) {
      const form = new FormData();
      form.append("file", aboutImage[0]);
      const res = await httpClient.post<{ url: string }>(
        `${base}/upload-image`,
        form,
      );
      imgUrl = res.data?.url ?? "";
    }

saveMutation.mutate(
      httpClient.put(`${base}/about`, {
        heading: about.heading || undefined,
        body: about.body.trim(),
        imageUrl: imgUrl || undefined,
        isVisible: about.isVisible,
      }),
    );
    setAbout((prev) => ({ ...prev, imageUrl: imgUrl }));
    setAboutImage([]);
  };

  const deleteAbout = () => {
    saveMutation.mutate(httpClient.delete(`${base}/about`));
    setAbout(emptyAbout);
    setDeleting(null);
  };

  // ─── CONTACT handlers ───
  const saveContact = () => {
    const err = validateContactNumber(contact.phone);
    if (err) {
      setContactError(err);
      toast.error(err);
      return;
    }
    setContactError(null);
    saveMutation.mutate(
      httpClient.put(`${base}/contact`, {
        heading: contact.heading || undefined,
        phone: contact.phone || undefined,
        email: contact.email || undefined,
        address: contact.address || undefined,
        openingHours: contact.openingHours || undefined,
        isVisible: contact.isVisible,
      }),
    );
  };

  const deleteContact = () => {
    saveMutation.mutate(httpClient.delete(`${base}/contact`));
    setContact(emptyContact);
    setDeleting(null);
  };

  // ─── FAQ handlers ───
  const saveFaq = () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim())
      return toast.error("Question and answer are required");

    saveMutation.mutate(
      editingFaqId
        ? httpClient.patch(`${base}/faqs/${editingFaqId}`, faqForm)
        : httpClient.post(`${base}/faqs`, faqForm),
    );
    setFaqForm(emptyFaq);
    setEditingFaqId(null);
  };

  const editFaq = (item: FaqItem) => {
    setEditingFaqId(item.id);
    setFaqForm({
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  };

  const deleteFaq = () => {
    if (!deleting) return;
    saveMutation.mutate(httpClient.delete(`${base}/faqs/${deleting.id}`));
    setDeleting(null);
    if (editingFaqId === deleting.id) {
      setFaqForm(emptyFaq);
      setEditingFaqId(null);
    }
  };

  // ─── GALLERY handlers ───
  const uploadGallery = () => {
    if (!galleryFiles.length) return toast.error("Choose at least one image");

    const form = new FormData();
    galleryFiles.forEach((file) => form.append("files", file));
    if (galleryTitle.trim()) form.append("title", galleryTitle.trim());
    if (galleryDescription.trim())
      form.append("description", galleryDescription.trim());

    saveMutation.mutate(
      httpClient.post(`${base}/gallery/upload`, form).then(() => {
        setGalleryFiles([]);
        setGalleryTitle("");
        setGalleryDescription("");
      }),
    );
  };

  const saveGalleryEdit = () => {
    if (!editingGallery) return;
    saveMutation.mutate(
      httpClient
        .patch(`${base}/gallery/${editingGallery.id}`, {
          title: editingGallery.title,
          description: editingGallery.description,
          sortOrder: editingGallery.sortOrder,
          active: editingGallery.active,
        })
        .then(() => setEditingGallery(null)),
    );
  };

  const toggleGalleryActive = (item: GalleryItem, active: boolean) =>
    saveMutation.mutate(
      httpClient.patch(`${base}/gallery/${item.id}`, { active }),
    );

  const deleteGallery = () => {
    if (!deleting) return;
    saveMutation.mutate(httpClient.delete(`${base}/gallery/${deleting.id}`));
    setDeleting(null);
  };

  // ─── BLOG handlers ───
  const generatedSlug = slugify(blog.title);
  const effectiveSlug = customSlug ? blog.slug.trim() : generatedSlug;

  const resetBlog = () => {
    setBlog(emptyBlog);
    setBlogCover([]);
    setEditingBlogId(null);
    setCustomSlug(false);
  };

  const saveBlog = async () => {
    if (!blog.title.trim() || !blog.content.trim())
      return toast.error("Title and content are required");
    if (!effectiveSlug) return toast.error("Slug could not be generated");

    let coverImage = blog.coverImage || undefined;
    if (blogCover.length) {
      const form = new FormData();
      form.append("file", blogCover[0]);
      const res = await httpClient.post<{ url: string }>(
        `${base}/upload-image`,
        form,
      );
      coverImage = res.data?.url;
    }

    const payload = {
      title: blog.title.trim(),
      slug: effectiveSlug,
      content: blog.content.trim(),
      coverImage,
      readMinutes: blog.readMinutes === "" ? undefined : blog.readMinutes,
      published: blog.published,
    };

    saveMutation.mutate(
      editingBlogId
        ? httpClient.patch(`${base}/blogs/${editingBlogId}`, payload)
        : httpClient.post(`${base}/blogs`, payload),
    );
    resetBlog();
  };

  const editBlog = (item: Blog) => {
    setEditingBlogId(item.id);
    setBlog({
      title: item.title,
      slug: item.slug,
      content: item.content,
      coverImage: item.coverImage ?? "",
      readMinutes: item.readMinutes ?? "",
      published: item.published,
    });
    setBlogCover([]);
    setCustomSlug(item.slug !== slugify(item.title));
  };

  const deleteBlog = () => {
    if (!deleting) return;
    saveMutation.mutate(httpClient.delete(`${base}/blogs/${deleting.id}`));
    if (editingBlogId === deleting.id) resetBlog();
    setDeleting(null);
  };

  // ─── ANNOUNCEMENT handlers ───
  const saveAnnouncement = () => {
    if (!announcement.title.trim() || !announcement.message.trim())
      return toast.error("Title and message are required");

    saveMutation.mutate(
      editingAnnouncementId
        ? httpClient.patch(
            `${base}/announcements/${editingAnnouncementId}`,
            announcement,
          )
        : httpClient.post(`${base}/announcements`, announcement),
    );
    setAnnouncement(emptyAnnouncement);
    setEditingAnnouncementId(null);
  };

  const editAnnouncement = (item: Announcement) => {
    setEditingAnnouncementId(item.id);
    setAnnouncement({
      title: item.title,
      message: item.message,
      type: item.type,
      isActive: item.isActive,
      pinned: item.pinned,
    });
  };

  const deleteAnnouncement = () => {
    if (!deleting) return;
    saveMutation.mutate(
      httpClient.delete(`${base}/announcements/${deleting.id}`),
    );
    setDeleting(null);
  };

  // ─── SOCIAL handlers ───
  const saveSocial = () => {
    if (!social.url.trim()) return toast.error("URL is required");

    saveMutation.mutate(
      editingSocialId
        ? httpClient.patch(`${base}/social-links/${editingSocialId}`, social)
        : httpClient.post(`${base}/social-links`, social),
    );
    setSocial(emptySocial);
    setEditingSocialId(null);
  };

  const editSocial = (item: SocialLink) => {
    setEditingSocialId(item.id);
    setSocial({
      platform: item.platform,
      url: item.url,
      icon: item.icon ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  };

  const deleteSocial = () => {
    if (!deleting) return;
    saveMutation.mutate(httpClient.delete(`${base}/social-links/${deleting.id}`));
    setDeleting(null);
  };

  // ─── Master delete dispatcher ───
  const confirmDelete = () => {
    if (!deleting) return;
    switch (deleting.kind) {
      case "hero":
        return deleteHero();
      case "about":
        return deleteAbout();
      case "contact":
        return deleteContact();
      case "gallery":
        return deleteGallery();
      case "blog":
        return deleteBlog();
      case "faq":
        return deleteFaq();
      case "announcement":
        return deleteAnnouncement();
      case "social":
        return deleteSocial();
    }
  };

  const isSaving = saveMutation.isPending;

  // ─── Section counts for tab badges ───
  const counts: Record<TabKey, number> = {
    hero: hero.headline ? 1 : 0,
    about: about.body ? 1 : 0,
    gallery: gallery.length,
    stories: blogs.length,
    faq: faqs.length,
    notices: announcements.length,
    contact: contact.phone || contact.email || contact.address ? 1 : 0,
    social: socialLinks.length,
  };

  return (
    <section className="dashboard-section pb-10">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Content Studio
            </h1>
            {isVerified && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-semibold uppercase text-primary">
                ✓ Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Build your public one-page website. Changes preview instantly on the
            right.
          </p>
        </div>
      </div>

      {/* ═══════════════ TABS ═══════════════ */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              <Icon className="size-3.5" />
              {label}
              {counts[key] > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-2xs",
                    active
                      ? "bg-background/25 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ TWO-PANE LAYOUT ═══════════════ */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* ─── LEFT: Active tab editor ─── */}
        <div className="space-y-3">
          {TABS.find((t) => t.key === tab) && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = TABS.find((t) => t.key === tab)!.icon;
                    return <Icon className="size-4 text-primary" />;
                  })()}
                  <h2 className="text-sm font-semibold">
                    {TABS.find((t) => t.key === tab)!.label}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TABS.find((t) => t.key === tab)!.description}
                </p>
              </div>

              <div className="mt-4 space-y-3.5">
                {/* ═══════════ HERO ═══════════ */}
                {tab === "hero" && (
                  <>
                    <FormField label="Headline" htmlFor="hero-headline">
                      <Input
                        id="hero-headline"
                        value={hero.headline}
                        onChange={(e) =>
                          setHero({ ...hero, headline: e.target.value })
                        }
                        placeholder="Play. Compete. Win."
                        className="h-9"
                      />
                    </FormField>

                    <FormField
                      label="Subheadline"
                      htmlFor="hero-sub"
                      hint="optional"
                    >
                      <Input
                        id="hero-sub"
                        value={hero.subheadline}
                        onChange={(e) =>
                          setHero({ ...hero, subheadline: e.target.value })
                        }
                        placeholder="Premium turfs, bookable in seconds"
                        className="h-9"
                      />
                    </FormField>

                    <FormField label="Cover image" hint="recommended 1333×500">
                      <ImagePicker
                        files={heroCoverFile}
                        onChange={setHeroCoverFile}
                      />
                      {hero.coverImage && !heroCoverFile.length && (
                        <div className="relative mt-2 aspect-[1333/500] overflow-hidden rounded-lg border border-border">
                          <img
                            src={getFileUrl(hero.coverImage) ?? ""}
                            alt="Current cover"
                            className="size-full object-cover"
                          />
                        </div>
                      )}
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Overlay opacity" htmlFor="hero-overlay">
                        <Input
                          id="hero-overlay"
                          type="number"
                          min={0}
                          max={100}
                          value={hero.overlayOpacity}
                          onChange={(e) =>
                            setHero({
                              ...hero,
                              overlayOpacity: Number(e.target.value) || 0,
                            })
                          }
                          className="h-9"
                        />
                      </FormField>

                      <FormField label="Text align" htmlFor="hero-align">
                        <Select
                          value={hero.textAlign}
                          onValueChange={(v) =>
                            setHero({
                              ...hero,
                              textAlign: v as "LEFT" | "CENTER" | "RIGHT",
                            })
                          }
                        >
                          <SelectTrigger id="hero-align" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LEFT">Left</SelectItem>
                            <SelectItem value="CENTER">Center</SelectItem>
                            <SelectItem value="RIGHT">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {hero.isVisible ? (
                          <Eye className="size-3.5 text-primary" />
                        ) : (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium">
                          {hero.isVisible ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <Switch
                        checked={hero.isVisible}
                        onCheckedChange={(c) =>
                          setHero({ ...hero, isVisible: c })
                        }
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveHero}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save hero
                      </Button>
                      {initialData.hero && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleting({
                              kind: "hero",
                              id: "hero",
                              label: "Hero section",
                            })
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ ABOUT ═══════════ */}
                {tab === "about" && (
                  <>
                    <FormField label="Heading" htmlFor="about-heading">
                      <Input
                        id="about-heading"
                        value={about.heading}
                        onChange={(e) =>
                          setAbout({ ...about, heading: e.target.value })
                        }
                        className="h-9"
                      />
                    </FormField>

                    <FormField label="Body" htmlFor="about-body">
                      <Textarea
                        id="about-body"
                        rows={5}
                        value={about.body}
                        onChange={(e) =>
                          setAbout({ ...about, body: e.target.value })
                        }
                        placeholder="What makes your turf special..."
                        className="min-h-32"
                      />
                    </FormField>

                    <FormField label="Image">
                      <ImagePicker
                        files={aboutImage}
                        onChange={setAboutImage}
                      />
                      {about.imageUrl && !aboutImage.length && (
                        <div className="relative mt-2 h-24 overflow-hidden rounded-lg border border-border">
                          <img
                            src={getFileUrl(about.imageUrl) ?? ""}
                            alt="Current"
                            className="size-full object-cover"
                          />
                        </div>
                      )}
                    </FormField>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveAbout}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save about
                      </Button>
                      {initialData.about && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleting({
                              kind: "about",
                              id: "about",
                              label: "About section",
                            })
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ GALLERY ═══════════ */}
                {tab === "gallery" && (
                  <>
                    <ImagePicker
                      files={galleryFiles}
                      onChange={setGalleryFiles}
                      multiple
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Title" hint="optional">
                        <Input
                          value={galleryTitle}
                          onChange={(e) => setGalleryTitle(e.target.value)}
                          placeholder="Friday night"
                          className="h-9"
                        />
                      </FormField>
                      <FormField label="Caption" hint="optional">
                        <Input
                          value={galleryDescription}
                          onChange={(e) =>
                            setGalleryDescription(e.target.value)
                          }
                          placeholder="Under lights"
                          className="h-9"
                        />
                      </FormField>
                    </div>

                    <Button
                      onClick={uploadGallery}
                      disabled={!galleryFiles.length || isSaving}
                      className="w-full gap-2"
                    >
                      <Plus className="size-4" />
                      Upload {galleryFiles.length || ""} image
                      {galleryFiles.length === 1 ? "" : "s"}
                    </Button>

                    <div className="border-t border-border pt-3">
                      {galleryLoading ? (
                        <TableLoadingState message="Loading..." />
                      ) : gallery.length === 0 ? (
                        <TableEmptyState
                          message="No images yet"
                          description="Upload your first image."
                        />
                      ) : (
                        <div className="space-y-2">
                          {gallery.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2"
                            >
                              <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                                <img
                                  src={getFileUrl(item.imageUrl) ?? ""}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              </div>
                              {editingGallery?.id === item.id ? (
                                <>
                                  <Input
                                    value={editingGallery.title ?? ""}
                                    onChange={(e) =>
                                      setEditingGallery({
                                        ...editingGallery,
                                        title: e.target.value,
                                      })
                                    }
                                    placeholder="Title"
                                    className="h-8 flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={saveGalleryEdit}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setEditingGallery(null)}
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">
                                      {item.title || "Untitled"}
                                    </p>
                                    {!item.active && (
                                      <StatusPill active={false} />
                                    )}
                                  </div>
                                  <Switch
                                    checked={item.active}
                                    onCheckedChange={(c) =>
                                      toggleGalleryActive(item, c)
                                    }
                                  />
                                  <RowActions
                                    onEdit={() => setEditingGallery(item)}
                                    onDelete={() =>
                                      setDeleting({
                                        kind: "gallery",
                                        id: item.id,
                                        label: item.title || "Image",
                                      })
                                    }
                                    deleteLabel="Delete"
                                  />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ STORIES ═══════════ */}
                {tab === "stories" && (
                  <>
                    <FormField label="Title">
                      <Input
                        value={blog.title}
                        onChange={(e) =>
                          setBlog({ ...blog, title: e.target.value })
                        }
                        className="h-9"
                      />
                    </FormField>

                    <FormField
                      label="Slug"
                      hint={customSlug ? "custom" : "auto"}
                    >
                      <div className="flex gap-2">
                        <Input
                          value={customSlug ? blog.slug : generatedSlug}
                          onChange={(e) =>
                            setBlog({ ...blog, slug: slugify(e.target.value) })
                          }
                          disabled={!customSlug}
                          className="h-9 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={() => {
                            if (customSlug)
                              setBlog({ ...blog, slug: generatedSlug });
                            setCustomSlug(!customSlug);
                          }}
                        >
                          {customSlug ? "Auto" : "Custom"}
                        </Button>
                      </div>
                    </FormField>

                    <FormField
                      label="Content"
                      hint={`${blog.content.length} chars`}
                    >
                      <Textarea
                        value={blog.content}
                        onChange={(e) =>
                          setBlog({ ...blog, content: e.target.value })
                        }
                        rows={5}
                        className="min-h-32"
                      />
                    </FormField>

                    <FormField label="Cover">
                      <ImagePicker files={blogCover} onChange={setBlogCover} />
                      {blog.coverImage && !blogCover.length && (
                        <div className="mt-2 h-20 overflow-hidden rounded-lg border border-border">
                          <img
                            src={getFileUrl(blog.coverImage) ?? ""}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                      )}
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Read minutes" hint="optional">
                        <Input
                          type="number"
                          min={1}
                          value={blog.readMinutes}
                          onChange={(e) =>
                            setBlog({
                              ...blog,
                              readMinutes:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            })
                          }
                          className="h-9"
                        />
                      </FormField>
                      <div className="flex items-end gap-2">
                        <div className="flex h-9 flex-1 items-center rounded-lg border border-border px-3">
                          <Switch
                            checked={blog.published}
                            onCheckedChange={(c) =>
                              setBlog({ ...blog, published: c })
                            }
                          />
                          <span className="ml-2 text-xs">
                            {blog.published ? "Published" : "Draft"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveBlog}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        <Save className="size-4" />
                        {editingBlogId ? "Update" : "Save"} story
                      </Button>
                      {editingBlogId && (
                        <Button variant="ghost" onClick={resetBlog}>
                          Cancel
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      {blogsLoading ? (
                        <TableLoadingState />
                      ) : blogs.length === 0 ? (
                        <TableEmptyState message="No stories yet" />
                      ) : (
                        <div className="space-y-2">
                          {blogs.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-xs font-medium">
                                    {item.title}
                                  </p>
                                  <StatusPill
                                    active={item.published}
                                    activeLabel="Live"
                                    inactiveLabel="Draft"
                                  />
                                </div>
                                <p className="truncate text-2xs text-muted-foreground">
                                  {toPreview(item.content)}
                                </p>
                              </div>
                              <RowActions
                                onEdit={() => editBlog(item)}
                                onDelete={() =>
                                  setDeleting({
                                    kind: "blog",
                                    id: item.id,
                                    label: item.title,
                                  })
                                }
                                deleteLabel="Delete"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ FAQ ═══════════ */}
                {tab === "faq" && (
                  <>
                    <FormField label="Question">
                      <Input
                        value={faqForm.question}
                        onChange={(e) =>
                          setFaqForm({
                            ...faqForm,
                            question: e.target.value,
                          })
                        }
                        placeholder="Do you provide parking?"
                        className="h-9"
                      />
                    </FormField>

                    <FormField label="Answer">
                      <Textarea
                        value={faqForm.answer}
                        onChange={(e) =>
                          setFaqForm({ ...faqForm, answer: e.target.value })
                        }
                        rows={3}
                        className="min-h-20"
                      />
                    </FormField>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveFaq}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        <Save className="size-4" />
                        {editingFaqId ? "Update" : "Add"} FAQ
                      </Button>
                      {editingFaqId && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setFaqForm(emptyFaq);
                            setEditingFaqId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      {faqs.length === 0 ? (
                        <TableEmptyState message="No FAQs yet" />
                      ) : (
                        <div className="space-y-2">
                          {faqs.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {item.question}
                                </p>
                                <p className="line-clamp-1 text-2xs text-muted-foreground">
                                  {item.answer}
                                </p>
                              </div>
                              <RowActions
                                onEdit={() => editFaq(item)}
                                onDelete={() =>
                                  setDeleting({
                                    kind: "faq",
                                    id: item.id,
                                    label: item.question,
                                  })
                                }
                                deleteLabel="Delete"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ NOTICES ═══════════ */}
                {tab === "notices" && (
                  <>
                    <FormField label="Title">
                      <Input
                        value={announcement.title}
                        onChange={(e) =>
                          setAnnouncement({
                            ...announcement,
                            title: e.target.value,
                          })
                        }
                        className="h-9"
                      />
                    </FormField>

                    <FormField label="Message">
                      <Textarea
                        value={announcement.message}
                        onChange={(e) =>
                          setAnnouncement({
                            ...announcement,
                            message: e.target.value,
                          })
                        }
                        rows={3}
                        className="min-h-20"
                      />
                    </FormField>

                    <div className="grid grid-cols-3 gap-2">
                      <FormField label="Type">
                        <Select
                          value={announcement.type}
                          onValueChange={(v) =>
                            setAnnouncement({ ...announcement, type: v })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ANNOUNCEMENT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <div className="flex items-end">
                        <div className="flex h-9 w-full items-center rounded-lg border border-border px-3">
                          <Switch
                            checked={announcement.isActive}
                            onCheckedChange={(c) =>
                              setAnnouncement({
                                ...announcement,
                                isActive: c,
                              })
                            }
                          />
                          <span className="ml-2 text-2xs">Visible</span>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <div className="flex h-9 w-full items-center rounded-lg border border-border px-3">
                          <Switch
                            checked={announcement.pinned}
                            onCheckedChange={(c) =>
                              setAnnouncement({
                                ...announcement,
                                pinned: c,
                              })
                            }
                          />
                          <Pin className="ml-1 size-3" />
                          <span className="ml-1 text-2xs">Pin</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveAnnouncement}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        <Save className="size-4" />
                        {editingAnnouncementId ? "Update" : "Add"} notice
                      </Button>
                      {editingAnnouncementId && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setAnnouncement(emptyAnnouncement);
                            setEditingAnnouncementId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      {announcementsLoading ? (
                        <TableLoadingState />
                      ) : announcements.length === 0 ? (
                        <TableEmptyState message="No notices yet" />
                      ) : (
                        <div className="space-y-2">
                          {announcements.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  {item.pinned && (
                                    <Pin className="size-3 text-primary" />
                                  )}
                                  <p className="truncate text-xs font-medium">
                                    {item.title}
                                  </p>
                                  <StatusPill active={item.isActive} />
                                </div>
                                <p className="line-clamp-1 text-2xs text-muted-foreground">
                                  {item.message}
                                </p>
                              </div>
                              <RowActions
                                onEdit={() => editAnnouncement(item)}
                                onDelete={() =>
                                  setDeleting({
                                    kind: "announcement",
                                    id: item.id,
                                    label: item.title,
                                  })
                                }
                                deleteLabel="Delete"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ CONTACT ═══════════ */}
                {tab === "contact" && (
                  <>
                    <FormField label="Heading">
                      <Input
                        value={contact.heading}
                        onChange={(e) =>
                          setContact({ ...contact, heading: e.target.value })
                        }
                        className="h-9"
                      />
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Phone">
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={contact.phone}
                            onChange={(e) => {
                              setContact({ ...contact, phone: e.target.value });
                              setContactError(validateContactNumber(e.target.value));
                            }}
                            placeholder="01712345678"
                            className="h-9 pl-8"
                          />
                        </div>
                        {contactError && (
                          <p className="mt-1 text-xs text-destructive">
                            {contactError}
                          </p>
                        )}
                      </FormField>
                      <FormField label="Email">
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={contact.email}
                            onChange={(e) =>
                              setContact({
                                ...contact,
                                email: e.target.value,
                              })
                            }
                            className="h-9 pl-8"
                          />
                        </div>
                      </FormField>
                    </div>

                    <FormField label="Address">
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <Textarea
                          value={contact.address}
                          onChange={(e) =>
                            setContact({
                              ...contact,
                              address: e.target.value,
                            })
                          }
                          rows={2}
                          className="min-h-16 pl-8"
                        />
                      </div>
                    </FormField>

                    <FormField label="Opening hours">
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={contact.openingHours}
                          onChange={(e) =>
                            setContact({
                              ...contact,
                              openingHours: e.target.value,
                            })
                          }
                          placeholder="9 AM - 11 PM"
                          className="h-9 pl-8"
                        />
                      </div>
                    </FormField>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveContact}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        <Save className="size-4" />
                        Save contact
                      </Button>
                      {initialData.contact && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleting({
                              kind: "contact",
                              id: "contact",
                              label: "Contact section",
                            })
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════════ SOCIAL ═══════════ */}
                {tab === "social" && (
                  <>
                    <FormField label="Platform">
                      <Select
                        value={social.platform}
                        onValueChange={(v) =>
                          setSocial({ ...social, platform: v })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="URL">
                      <Input
                        value={social.url}
                        onChange={(e) =>
                          setSocial({ ...social, url: e.target.value })
                        }
                        placeholder="https://..."
                        className="h-9"
                      />
                    </FormField>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveSocial}
                        disabled={isSaving}
                        className="flex-1 gap-2"
                      >
                        <Save className="size-4" />
                        {editingSocialId ? "Update" : "Add"} link
                      </Button>
                      {editingSocialId && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSocial(emptySocial);
                            setEditingSocialId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      {socialLoading ? (
                        <TableLoadingState />
                      ) : socialLinks.length === 0 ? (
                        <TableEmptyState message="No social links yet" />
                      ) : (
                        <div className="space-y-2">
                          {socialLinks.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2"
                            >
                              <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-2xs font-semibold uppercase text-primary">
                                {item.platform.slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium capitalize">
                                  {item.platform}
                                </p>
                                <p className="truncate text-2xs text-muted-foreground">
                                  {item.url}
                                </p>
                              </div>
                              <RowActions
                                onEdit={() => editSocial(item)}
                                onDelete={() =>
                                  setDeleting({
                                    kind: "social",
                                    id: item.id,
                                    label: item.platform,
                                  })
                                }
                                deleteLabel="Delete"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Live preview ─── */}
        <div className="xl:sticky xl:top-20 xl:h-fit">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-primary" />
              <p className="text-sm font-semibold">Live preview</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
              Public page
            </span>
          </div>
          <LandingPreview
            data={previewData}
            ownerName={ownerName}
            companyName={companyName}
            businessLogo={businessLogo}
            isVerified={isVerified}
          />
        </div>
      </div>

      {/* ═══════════════ DELETE CONFIRM ═══════════════ */}
      <DeleteConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this item?"
        description={
          deleting
            ? `"${deleting.label}" will be permanently removed from your page.`
            : ""
        }
        onConfirm={confirmDelete}
        isPending={isSaving}
        trigger={<span className="hidden" />}
      />
    </section>
  );
}