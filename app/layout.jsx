import './globals.css';

export const metadata = {
  title: 'ATHLOS League',
  description: 'The fastest women on Earth. Two cities. One season.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
