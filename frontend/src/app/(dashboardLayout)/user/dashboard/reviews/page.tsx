import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "My Reviews",
  description: "View your reviews",
};

export default function Page() {
  return <PageClient />;
}




