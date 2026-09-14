import { AdminTurfFormPage } from "../../new/page";

export default async function AdminEditTurfPage({ params }: { params: Promise<{ turfId: string }> }) {
  const { turfId } = await params;
  return <AdminTurfFormPage turfId={turfId} />;
}