import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Bookings",
  description: "Manage admin bookings",
};

export default function Page() {
  return <PageClient />;
}




