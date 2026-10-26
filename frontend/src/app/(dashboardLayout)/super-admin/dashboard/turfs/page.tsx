import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Turfs",
  description: "Manage all turfs",
};

export default function Page() {
  return <PageClient />;
}




