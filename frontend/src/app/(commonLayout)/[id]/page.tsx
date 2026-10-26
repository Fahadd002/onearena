import { Metadata } from "next";
import { notFound } from "next/navigation";
import PageClient from "./pageClient";


interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/owners/${id}/landing`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });
    
    if (!response.ok) {
      return {
        title: "Owner Not Found | OneArena",
        description: "This owner page is unavailable or has been removed.",
      };
    }
    
    const data = await response.json();
    const owner = data.data.owner;
    const companyName = owner.business.companyName;
    
    return {
      title: `${companyName} | OneArena`,
      description: data.data?.about || `Explore venues, stories and updates from ${companyName}`,
      openGraph: {
        title: `${companyName} | OneArena`,
        description: data.data?.about || `Explore venues, stories and updates from ${companyName}`,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Owner Not Found | OneArena",
      description: "This owner page is unavailable or has been removed.",
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  
  // Verify owner exists
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/owners/${id}/landing`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });
    
    if (!response.ok) {
      notFound();
    }
  } catch {
    notFound();
  }
  
  return <PageClient />;
}