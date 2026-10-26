"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { paginationParams } from "@/types/api.type";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Star, MessageSquare, Loader2, ArrowLeft, X } from "lucide-react";

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

type EligibilityResponse = {
  eligible: boolean;
  reason?: string;
  existingReview?: Review;
  turfId?: string;
};

export default function UserReviewsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const writeBookingId = searchParams.get("write");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["user-reviews"],
    queryFn: async () => {
      const result = await httpClient.get<{ data: Review[]; meta: paginationParams }>(`${API_ENDPOINTS.marketplace.reviews}?scope=user`);
      return result.data?.data ?? [];
    },
    enabled: !!session && !writeBookingId,
  });

  const { data: eligibility, isLoading: eligibilityLoading } = useQuery<EligibilityResponse>({
    queryKey: ["review-eligibility", writeBookingId],
    queryFn: async () => {
      const result = await httpClient.get<EligibilityResponse>(
        API_ENDPOINTS.marketplace.reviewEligibility.replace(":bookingId", writeBookingId!)
      );
      return result.data ?? { eligible: false, reason: "Unknown error" };
    },
    enabled: !!session && !!writeBookingId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeBookingId) return;
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setIsSubmitting(true);
    try {
      await httpClient.post(
        API_ENDPOINTS.marketplace.reviewCreate.replace(":bookingId", writeBookingId),
        { rating, comment: comment.trim() }
      );
      toast.success("Review submitted successfully");
      router.push("/user/dashboard/reviews");
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to submit review";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/user/dashboard/reviews");
  };

  if (writeBookingId) {
    if (eligibilityLoading) {
      return (
        <section className="dashboard-section">
          <div>
            <p className="dashboard-meta">Your activity</p>
            <h1 className="dashboard-title">Write Review</h1>
          </div>
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </section>
      );
    }

    if (!eligibility?.eligible) {
      return (
        <section className="dashboard-section">
          <div>
            <p className="dashboard-meta">Your activity</p>
            <h1 className="dashboard-title">Write Review</h1>
          </div>
          <Card className="mt-8 dashboard-panel max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Cannot write review</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-4">
              <X className="mx-auto h-12 w-12 text-destructive/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {eligibility?.reason || "This booking is not eligible for review."}
              </p>
              {eligibility?.existingReview && (
                <p className="mt-2 text-sm text-muted-foreground">
                  You have already reviewed this booking.
                </p>
              )}
              <Button variant="outline" onClick={handleCancel} className="mt-6">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to reviews
              </Button>
            </CardContent>
          </Card>
        </section>
      );
    }

    return (
      <section className="dashboard-section">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="dashboard-meta">Your activity</p>
            <h1 className="dashboard-title">Write Review</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <Card className="dashboard-panel max-w-2xl">
          <CardHeader>
            <CardTitle>Share your experience</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="block text-sm font-medium mb-2">Rating</Label>
                <div className="flex items-center gap-2" role="radiogroup" aria-label="Select rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={rating === i + 1}
                      onClick={() => setRating(i + 1)}
                      className={`p-1 transition-colors ${
                        i < rating ? "text-yellow-400" : "text-border hover:text-yellow-300"
                      }`}
                      aria-label={`${i + 1} star${i + 1 > 1 ? "s" : ""}`}
                    >
                      <Star className={`h-8 w-8 ${i < rating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="comment" className="block text-sm font-medium mb-2">
                  Comment (optional)
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Tell others about your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                  maxLength={1000}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || rating === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="dashboard-meta">Your activity</p>
          <h1 className="dashboard-title">Reviews</h1>
          <p className="mt-3 text-muted-foreground">Share your experience after a booking.</p>
        </div>
      </div>
      {reviewsLoading ? (
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
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{review.rating}/5</span>
                  {review.isHidden && (
                    <span className="text-xs rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      Hidden
                    </span>
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