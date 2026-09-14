"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type GalleryItem = { id: string; imageUrl: string; title?: string | null; description?: string | null; sortOrder: number; active: boolean };
type Blog = { id: string; title: string; slug: string; excerpt?: string | null; content: string; coverImage?: string | null; published: boolean; publishedAt?: string | null };
type Tab = "gallery" | "blogs";

const emptyBlog = { title: "", slug: "", excerpt: "", content: "", coverImage: "", published: false };

export default function ContentStudioPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("gallery");
  const [galleryUrl, setGalleryUrl] = useState("");
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [blog, setBlog] = useState(emptyBlog);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);

  const galleryQuery = useQuery({
    queryKey: ["owner-content-gallery"],
    queryFn: async () => (await httpClient.get<GalleryItem[]>(`${API_ENDPOINTS.marketplace.ownerContent}/gallery`)).data ?? [],
  });
  const blogsQuery = useQuery({
    queryKey: ["owner-content-blogs"],
    queryFn: async () => (await httpClient.get<Blog[]>(`${API_ENDPOINTS.marketplace.ownerContent}/blogs`)).data ?? [],
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["owner-content-gallery"] });
    void queryClient.invalidateQueries({ queryKey: ["owner-content-blogs"] });
  };
  const action = useMutation({
    mutationFn: async (request: Promise<unknown>) => request,
    onSuccess: () => { refresh(); toast.success("Content saved"); },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to save content"),
  });

  const saveGalleryUrl = () => {
    if (!galleryUrl.trim()) return toast.error("Add an image URL first");
    action.mutate(httpClient.post(`${API_ENDPOINTS.marketplace.ownerContent}/gallery`, { imageUrl: galleryUrl, title: galleryTitle, description: galleryDescription }));
    setGalleryUrl(""); setGalleryTitle(""); setGalleryDescription("");
  };
  const uploadGallery = () => {
    if (!files.length) return toast.error("Choose at least one image");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    action.mutate(httpClient.post(`${API_ENDPOINTS.marketplace.ownerContent}/gallery/upload`, form));
    setFiles([]);
  };
  const saveGalleryEdit = () => {
    if (!editingGallery) return;
    action.mutate(httpClient.patch(`${API_ENDPOINTS.marketplace.ownerContent}/gallery/${editingGallery.id}`, { title: editingGallery.title, description: editingGallery.description, sortOrder: editingGallery.sortOrder, active: editingGallery.active }));
    setEditingGallery(null);
  };
  const deleteGallery = (id: string) => { if (window.confirm("Delete this gallery image?")) action.mutate(httpClient.delete(`${API_ENDPOINTS.marketplace.ownerContent}/gallery/${id}`)); };
  const saveBlog = () => {
    if (!blog.title.trim() || !blog.content.trim()) return toast.error("Title and content are required");
    const payload = { ...blog, slug: blog.slug || blog.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
    action.mutate(editingBlogId ? httpClient.patch(`${API_ENDPOINTS.marketplace.ownerContent}/blogs/${editingBlogId}`, payload) : httpClient.post(`${API_ENDPOINTS.marketplace.ownerContent}/blogs`, payload));
    setBlog(emptyBlog); setEditingBlogId(null);
  };
  const editBlog = (item: Blog) => { setEditingBlogId(item.id); setBlog({ title: item.title, slug: item.slug, excerpt: item.excerpt ?? "", content: item.content, coverImage: item.coverImage ?? "", published: item.published }); setTab("blogs"); };
  const deleteBlog = (id: string) => { if (window.confirm("Delete this blog post?")) action.mutate(httpClient.delete(`${API_ENDPOINTS.marketplace.ownerContent}/blogs/${id}`)); };

  return (
    <section className="dashboard-section space-y-5">
      <div><p className="dashboard-meta">Owner website</p><h1 className="dashboard-title mt-1">Content Studio</h1><p className="mt-1 text-sm text-muted-foreground">Manage the gallery and stories shown on your public owner page.</p></div>
      <div className="flex gap-2 border-b border-border"><Button variant={tab === "gallery" ? "default" : "ghost"} onClick={() => setTab("gallery")}><ImagePlus className="size-4" /> Gallery</Button><Button variant={tab === "blogs" ? "default" : "ghost"} onClick={() => setTab("blogs")}><Pencil className="size-4" /> Blogs</Button></div>

      {tab === "gallery" ? <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card><CardHeader><CardTitle>Add gallery images</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Image URL</Label><Input value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} placeholder="https://..." /></div><div><Label>Title</Label><Input value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} placeholder="Friday night under lights" /></div><div><Label>Description</Label><Textarea value={galleryDescription} onChange={(e) => setGalleryDescription(e.target.value)} placeholder="A short caption for visitors" /></div><Button className="w-full" onClick={saveGalleryUrl} disabled={action.isPending}><Plus className="size-4" /> Add image URL</Button><div className="relative border-t pt-4"><Input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /><p className="mt-2 text-xs text-muted-foreground">{files.length ? `${files.length} image(s) selected` : "Or upload images directly to Cloudinary"}</p><Button className="mt-3 w-full" variant="outline" onClick={uploadGallery} disabled={action.isPending || !files.length}><Upload className="size-4" /> Upload selected</Button></div></CardContent></Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{galleryQuery.isLoading ? <p className="text-muted-foreground">Loading gallery...</p> : galleryQuery.data?.map((item) => <Card key={item.id} className={!item.active ? "opacity-60" : ""}><div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-muted"><img src={item.imageUrl} alt={item.title || "Gallery image"} className="size-full object-cover" /></div><CardContent className="space-y-3 p-4">{editingGallery?.id === item.id ? <><Input value={editingGallery.title ?? ""} onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value })} placeholder="Title" /><Textarea value={editingGallery.description ?? ""} onChange={(e) => setEditingGallery({ ...editingGallery, description: e.target.value })} placeholder="Description" /><div className="flex items-center justify-between"><Label>Visible</Label><Switch checked={editingGallery.active} onCheckedChange={(checked) => setEditingGallery({ ...editingGallery, active: checked })} /></div><div className="flex gap-2"><Button size="sm" onClick={saveGalleryEdit}><Save className="size-4" /> Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingGallery(null)}><X className="size-4" /></Button></div></> : <><div><p className="font-medium">{item.title || "Untitled image"}</p><p className="line-clamp-2 text-xs text-muted-foreground">{item.description || "No description"}</p></div><div className="flex justify-between"><Button size="sm" variant="outline" onClick={() => setEditingGallery(item)}><Pencil className="size-4" /> Edit</Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteGallery(item.id)}><Trash2 className="size-4" /></Button></div></>}</CardContent></Card>)}</div>
      </div> : <div className="grid gap-5 xl:grid-cols-[380px_1fr]"><Card><CardHeader><CardTitle>{editingBlogId ? "Edit story" : "Write a story"}</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Title</Label><Input value={blog.title} onChange={(e) => setBlog({ ...blog, title: e.target.value })} /></div><div><Label>Slug</Label><Input value={blog.slug} onChange={(e) => setBlog({ ...blog, slug: e.target.value })} placeholder="generated-from-title" /></div><div><Label>Excerpt</Label><Textarea value={blog.excerpt} onChange={(e) => setBlog({ ...blog, excerpt: e.target.value })} /></div><div><Label>Cover image URL</Label><Input value={blog.coverImage} onChange={(e) => setBlog({ ...blog, coverImage: e.target.value })} placeholder="https://..." /></div><div><Label>Content</Label><Textarea className="min-h-44" value={blog.content} onChange={(e) => setBlog({ ...blog, content: e.target.value })} /></div><div className="flex items-center justify-between"><Label>Publish on owner page</Label><Switch checked={blog.published} onCheckedChange={(checked) => setBlog({ ...blog, published: checked })} /></div><div className="flex gap-2"><Button onClick={saveBlog} disabled={action.isPending}><Save className="size-4" /> {editingBlogId ? "Update story" : "Save story"}</Button>{editingBlogId && <Button variant="ghost" onClick={() => { setEditingBlogId(null); setBlog(emptyBlog); }}>Cancel</Button>}</div></CardContent></Card><div className="space-y-3">{blogsQuery.isLoading ? <p className="text-muted-foreground">Loading stories...</p> : blogsQuery.data?.map((item) => <Card key={item.id}><CardContent className="flex gap-4 p-4">{item.coverImage && <img src={item.coverImage} alt="" className="size-24 rounded-lg object-cover" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] ${item.published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{item.published ? "Published" : "Draft"}</span></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.excerpt || item.content}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => editBlog(item)}><Pencil className="size-4" /> Edit</Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteBlog(item.id)}><Trash2 className="size-4" /></Button></div></div></CardContent></Card>)}</div></div>}
    </section>
  );
}