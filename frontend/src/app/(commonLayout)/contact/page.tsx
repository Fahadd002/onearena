import { Metadata } from "next";
import ContactPageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the OneArena team about bookings, refunds, owner registration or partnerships",
};

export default function ContactPage() {
  return <ContactPageClient />;
}