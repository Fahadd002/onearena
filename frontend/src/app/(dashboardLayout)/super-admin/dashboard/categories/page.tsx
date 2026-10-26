import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage categories",
};

export default function Page() {
  return <PageClient />;
}




