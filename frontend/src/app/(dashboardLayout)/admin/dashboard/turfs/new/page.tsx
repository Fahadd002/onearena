import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "New Turf",
  description: "Create new turf",
};

export default function Page() {
  return <PageClient />;
}




