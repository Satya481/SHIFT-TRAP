import "./globals.css";

export const metadata = {
  title: "SHIFT//TRAP",
  description: "An AI dynamic obstacle platform game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}