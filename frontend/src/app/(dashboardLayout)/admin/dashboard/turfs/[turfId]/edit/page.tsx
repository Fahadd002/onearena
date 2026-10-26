import { Metadata } from "next";
import { AdminTurfFormPage } from "../../new/pageClient";

export const metadata: Metadata = {
  title: "Edit Turf",
  description: "Edit turf details and settings",
};

export default async function AdminEditTurfPage({ params }: { params: Promise<{ turfId: string }> }) {
  const { turfId } = await params;
  return <AdminTurfFormPage turfId={turfId} />;
}