"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";

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
  turf: { id: string; name: string };
  replies: ReviewReply[];
};

export default function UserReviewsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["user-reviews"],
    queryFn: async () => {
      const result = await httpClient.get<Review[]>(`${API_ENDPOINTS.marketplace.reviews}?scope=user`);
      return result.data ?? [];
    },
    enabled: !!session,
  });

  return (
    <section className="dashboard-section">
      <div>
        <p className="dashboard-meta">Your activity</p>
        <h1 className="dashboard-title">Reviews</h1>
        <p className="mt-3 text-muted-foreground">Share your experience after a booking.</p>
      </div>
      {isLoading ? (
        <p className="dashboard-empty mt-8">Loading reviews...</p>
      ) : (
        <div className="mt-8 space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{review.turf.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{review.rating}/5</span>
                  {review.isHidden && (
                    <span className="text-xs rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Hidden</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{review.comment || "No comment"}</p>
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
              </CardContent>
            </Card>
          ))}
          {reviews.length === 0 && <p className="dashboard-empty">No reviews yet.</p>}
        </div>
      )}
    </section>
  );
}
