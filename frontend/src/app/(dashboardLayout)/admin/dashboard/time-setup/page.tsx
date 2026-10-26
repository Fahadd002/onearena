import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Time Setup",
  description: "Configure time slots",
};

export default function Page() {
  return <PageClient />;
}




