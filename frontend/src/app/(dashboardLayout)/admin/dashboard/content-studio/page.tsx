import { Metadata } from "next";

import { API_ENDPOINTS } from "@/lib/api/config";
import { httpClient } from "@/lib/axios/httpClient";
import type { ApiResponse } from "@/types/api.type";

import PageClient from "./pageClient";
import { getOwnerContent } from "./_server";

export const metadata: Metadata = {
  title: "Content Studio",
  description: "Build your public landing page",
};

export const dynamic = "force-dynamic";

type OwnerMe = {
  id: string;
  name: string;
  image: string | null;
  companyName: string | null;
  businessLogo: string | null;
  verificationStatus: string;
  contactNumber: string | null;
  bussinessEmail: string | null;
  address: string | null;
};

async function getOwnerMe(): Promise<OwnerMe | null> {
  try {
    const res = await httpClient.get<OwnerMe>(API_ENDPOINTS.auth.ownerProfile);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const [initialData, owner] = await Promise.all([getOwnerContent(), getOwnerMe()]);

  return (
    <PageClient
      initialData={initialData}
      ownerName={owner?.name ?? "Your Business"}
      companyName={owner?.companyName ?? null}
      businessLogo={owner?.businessLogo ?? null}
      isVerified={owner?.verificationStatus === "APPROVED"}
      profileContactNumber={owner?.contactNumber ?? null}
      profileBusinessEmail={owner?.bussinessEmail ?? null}
      profileAddress={owner?.address ?? null}
    />
  );
}