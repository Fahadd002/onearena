import ReCaptchaProvider from "@/providers/ReCaptchaProvider";

export default function AuthRouteGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ReCaptchaProvider>
      {children}
    </ReCaptchaProvider>
  );
}
