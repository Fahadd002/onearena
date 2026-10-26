import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwnerProfile } from "./_action";
import { ApiResponse } from "@/types/api.type";
import { OwnerProfile } from "./_types";

export const metadata: Metadata = {
  title: "Owner Profile",
  description: "Manage your owner profile and venue settings",
};

export default async function OwnerProfilePage() {
  let profile: OwnerProfile | null = null;
  try {
    const res = await getOwnerProfile();
    if (res.success) {
      profile = (res as ApiResponse<OwnerProfile>).data ?? null;
    }
  } catch {
    profile = null;
  }

  if (!profile) {
    redirect("/owner-profile/profile");
  }

  const status = profile.verificationStatus;

  if (status === "APPROVED") {
    redirect("/owner-profile/subscription");
  }

  if (status === "SUBMITTED") {
    redirect("/owner-profile/documents");
  }

  redirect("/owner-profile/profile");
}
