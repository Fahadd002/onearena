import PageSkeleton from "@/components/common/PageSkeleton";

type PageLoaderProps = { label?: string };

export default function PageLoader({ label: _label }: PageLoaderProps) {
  return <PageSkeleton />;
}
