import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Manager Turfs",
  description: "Manage turfs",
};

export default function Page() {
  return <PageClient />;
}




