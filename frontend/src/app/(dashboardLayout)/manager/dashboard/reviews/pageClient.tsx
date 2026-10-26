"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Star, MessageSquare, Loader2, EyeOff, Eye } from "lucide-react";

type ReviewReply = {
  id: string;
  comment: string;
  createdAt: string;
  user: { id: string; name: string };
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  isHidden: boolean;
  createdAt: string;
  user: { id: string; name: string };
  turf: { id: string; name: string };
  replies: ReviewReply[];
};

export default function ManagerReviewsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["manager-reviews"],
    queryFn: async () => {
      const result = await httpClient.get<Review[]>(`${API_ENDPOINTS.marketplace.reviews}?scope=manager`);
      return result.data ?? [];
    },
    enabled: !!session,
  });

  const hideMutation = useMutation({
    mutationFn: (reviewId: string) => httpClient.patch(`${API_ENDPOINTS.marketplace.reviewHide.replace(":reviewId", reviewId)}`, {}),
    onSuccess: () => {
      toast.success("Review hidden");
      queryClient.invalidateQueries({ queryKey: ["manager-reviews"] });
    },
    onError: () => toast.error("Failed to hide review"),
  });

  const unhideMutation = useMutation({
    mutationFn: (reviewId: string) => httpClient.patch(`${API_ENDPOINTS.marketplace.reviewUnhide.replace(":reviewId", reviewId)}`, {}),
    onSuccess: () => {
      toast.success("Review unhidden");
      queryClient.invalidateQueries({ queryKey: ["manager-reviews"] });
    },
    onError: () => toast.error("Failed to unhide review"),
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) =>
      httpClient.patch(`${API_ENDPOINTS.marketplace.reviewReply.replace(":reviewId", reviewId)}`, { comment }),
    onSuccess: (_data, variables) => {
      toast.success("Reply added");
      setReplyTexts((prev) => ({ ...prev, [variables.reviewId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["manager-reviews"] });
    },
    onError: () => toast.error("Failed to add reply"),
  });

  const handleReply = (reviewId: string) => {
    const comment = replyTexts[reviewId]?.trim();
    if (!comment) {
      toast.error("Please enter a reply");
      return;
    }
    replyMutation.mutate({ reviewId, comment });
  };

  return (
    <section className="dashboard-section">
      <p className="dashboard-meta">Manager area</p>
      <h1 className="dashboard-title">Reviews</h1>
      <p className="mt-3 text-muted-foreground">Customer reviews for your assigned turfs.</p>
      {isLoading ? (
        <p className="dashboard-empty mt-8">Loading reviews...</p>
      ) : (
        <div className="mt-8 space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{review.turf.name}</CardTitle>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">By {review.user.name} · {review.rating}/5</p>
                  <div className="flex items-center gap-2">
                    {review.isHidden ? (
                      <Button variant="ghost" size="sm" onClick={() => unhideMutation.mutate(review.id)} disabled={unhideMutation.isPending}>
                        <Eye className="h-4 w-4 mr-1" /> Unhide
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => hideMutation.mutate(review.id)} disabled={hideMutation.isPending}>
                        <EyeOff className="h-4 w-4 mr-1" /> Hide
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{review.isHidden ? "[Hidden by moderation]" : (review.comment || "No comment")}</p>
                {review.replies && review.replies.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Replies
                    </p>
                    {review.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg border border-border bg-secondary/30 p-3">
                        <p className="text-sm font-medium">{reply.user.name}</p>
                        <p className="text-sm text-muted-foreground">{reply.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyTexts[review.id] || ""}
                    onChange={(e) => setReplyTexts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                    className="min-h-[80px]"
                  />
                  <Button onClick={() => handleReply(review.id)} disabled={replyMutation.isPending && replyMutation.variables?.reviewId === review.id}>
                    {replyMutation.isPending && replyMutation.variables?.reviewId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {reviews.length === 0 && <p className="dashboard-empty">No reviews yet.</p>}
        </div>
      )}
    </section>
  );
}
