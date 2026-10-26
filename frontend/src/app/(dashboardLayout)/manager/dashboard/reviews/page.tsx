import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Manager Reviews",
  description: "Manage reviews",
};

export default function Page() {
  return <PageClient />;
}




