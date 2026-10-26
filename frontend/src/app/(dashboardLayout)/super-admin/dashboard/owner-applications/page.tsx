import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Applications",
  description: "Review owner applications",
};

export default function Page() {
  return <PageClient />;
}




